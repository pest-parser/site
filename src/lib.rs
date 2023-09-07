use std::collections::HashMap;

use pest::error::{Error, ErrorVariant, InputLocation};
use pest::iterators::Pair;

use pest_meta::parser::{self, Rule};
use pest_meta::{optimizer, validator};

use pest_vm::Vm;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Document, Event, InputEvent, Node};
use web_sys::{HtmlOptionElement, HtmlSelectElement, HtmlTextAreaElement};

static mut NEEDS_RUN: bool = false;
static mut VM: Option<Vm> = None;
static mut LAST_SELECTION: Option<String> = None;

fn document() -> Document {
    web_sys::window()
        .expect_throw("no window")
        .document()
        .expect_throw("no document")
}

fn element<T: JsCast>(sel: &str) -> T {
    document()
        .query_selector(sel)
        .unwrap_throw()
        .expect_throw(&format!("no {} element", sel))
        .dyn_into()
        .expect_throw("wrong element type")
}

fn create_element<T: JsCast>(tag: &str) -> T {
    document()
        .create_element(tag)
        .expect_throw(&format!("could not create {} element", tag))
        .dyn_into()
        .expect_throw("wrong element type")
}

fn listen_for_input() {
    let input = element::<Node>(".editor-input-text");

    let func = Closure::<dyn Fn(InputEvent)>::new(move |_| {
        unsafe {
            NEEDS_RUN = true;
        }
        wait_and_run();
    });

    input
        .add_event_listener_with_callback("input", func.as_ref().unchecked_ref())
        .unwrap_throw();
    func.forget();

    let select = element::<HtmlSelectElement>(".editor-input-select");

    let func = Closure::<dyn Fn(Event)>::new(move |_: Event| {
        unsafe {
            LAST_SELECTION = selected_option();
        }

        parse_input();
    });

    select
        .add_event_listener_with_callback("change", func.as_ref().unchecked_ref())
        .unwrap_throw();
    func.forget();
}

fn wait_and_run() {
    let win = web_sys::window().expect_throw("no window");
    let func = Closure::<dyn FnOnce()>::once_into_js(|| {
        if unsafe { NEEDS_RUN } {
            parse_input();
            unsafe {
                NEEDS_RUN = false;
            }
        }
    });

    win.set_timeout_with_callback_and_timeout_and_arguments_0(func.as_ref().unchecked_ref(), 800)
        .unwrap_throw();
}

fn parse_input() {
    let input = element::<HtmlTextAreaElement>(".editor-input-text");
    let output = element::<HtmlTextAreaElement>(".editor-output");

    if let Some(rule) = selected_option() {
        let vm = unsafe { VM.as_ref().expect_throw("no VM") };

        match vm.parse(&rule, &input.value()) {
            Ok(pairs) => {
                let lines: Vec<_> = pairs.map(|pair| format_pair(pair, 0, true)).collect();
                let lines = lines.join("\n");

                output.set_value(lines.as_str());
            }
            Err(error) => output.set_value(&format!("{}", error.renamed_rules(|r| r.to_string()))),
        };
    }
}

fn format_pair(pair: Pair<&str>, indent_level: usize, is_newline: bool) -> String {
    let indent = if is_newline {
        "  ".repeat(indent_level)
    } else {
        String::new()
    };

    let children: Vec<_> = pair.clone().into_inner().collect();
    let len = children.len();
    let children: Vec<_> = children
        .into_iter()
        .map(|pair| {
            format_pair(
                pair,
                if len > 1 {
                    indent_level + 1
                } else {
                    indent_level
                },
                len > 1,
            )
        })
        .collect();

    let dash = if is_newline { "- " } else { "" };

    match len {
        0 => format!(
            "{}{}{}: {:?}",
            indent,
            dash,
            pair.as_rule(),
            pair.as_span().as_str()
        ),
        1 => format!("{}{}{} > {}", indent, dash, pair.as_rule(), children[0]),
        _ => format!(
            "{}{}{}\n{}",
            indent,
            dash,
            pair.as_rule(),
            children.join("\n")
        ),
    }
}

fn selected_option() -> Option<String> {
    element::<HtmlSelectElement>(".editor-input-select")
        .selected_options()
        .item(0)?
        .text_content()
        .filter(|text| text != "...")
}

fn compile_grammar(grammar: &str) -> Vec<HashMap<String, String>> {
    let result = parser::parse(Rule::grammar_rules, grammar)
        .map_err(|error| error.renamed_rules(pest_meta::parser::rename_meta_rule));

    let pairs = match result {
        Ok(pairs) => pairs,
        Err(error) => {
            add_rules_to_select(vec![]);
            return vec![convert_error(error, grammar)];
        }
    };

    if let Err(errors) = validator::validate_pairs(pairs.clone()) {
        add_rules_to_select(vec![]);
        return errors
            .into_iter()
            .map(|e| convert_error(e, grammar))
            .collect();
    }

    let ast = match parser::consume_rules(pairs) {
        Ok(ast) => ast,
        Err(errors) => {
            add_rules_to_select(vec![]);
            return errors
                .into_iter()
                .map(|e| convert_error(e, grammar))
                .collect();
        }
    };

    unsafe {
        VM = Some(Vm::new(optimizer::optimize(ast.clone())));
    }

    add_rules_to_select(ast.iter().map(|rule| rule.name.as_str()).collect());

    parse_input();

    vec![]
}

fn convert_error(error: Error<Rule>, grammar: &str) -> HashMap<String, String> {
    let message = match error.variant {
        ErrorVariant::CustomError { message } => message,
        _ => unreachable!(),
    };

    match error.location {
        InputLocation::Pos(pos) => {
            let mut map = HashMap::new();

            map.insert("from".to_owned(), line_col(pos, grammar));
            map.insert("to".to_owned(), line_col(pos, grammar));
            map.insert("message".to_owned(), message);

            map
        }
        InputLocation::Span((start, end)) => {
            let mut map = HashMap::new();

            map.insert("from".to_owned(), line_col(start, grammar));
            map.insert("to".to_owned(), line_col(end, grammar));
            map.insert("message".to_owned(), message);

            map
        }
    }
}

fn line_col(pos: usize, input: &str) -> String {
    let (line, col) = {
        let mut pos = pos;
        // Position's pos is always a UTF-8 border.
        let slice = &input[..pos];
        let mut chars = slice.chars().peekable();

        let mut line_col = (1, 1);

        while pos != 0 {
            match chars.next() {
                Some('\r') => {
                    if let Some(&'\n') = chars.peek() {
                        chars.next();

                        if pos == 1 {
                            pos -= 1;
                        } else {
                            pos -= 2;
                        }

                        line_col = (line_col.0 + 1, 1);
                    } else {
                        pos -= 1;
                        line_col = (line_col.0, line_col.1 + 1);
                    }
                }
                Some('\n') => {
                    pos -= 1;
                    line_col = (line_col.0 + 1, 1);
                }
                Some(c) => {
                    pos -= c.len_utf8();
                    line_col = (line_col.0, line_col.1 + 1);
                }
                None => unreachable!(),
            }
        }

        line_col
    };

    format!("({}, {})", line - 1, col - 1)
}

fn add_rules_to_select(mut rules: Vec<&str>) {
    let select = element::<HtmlSelectElement>(".editor-input-select");

    while let Some(node) = select.first_child() {
        select.remove_child(&node).unwrap_throw();
    }

    select.set_disabled(rules.is_empty());
    if rules.is_empty() {
        rules.push("...");
    }

    for rule in rules {
        let option: HtmlOptionElement = create_element("option");
        option
            .append_child(&document().create_text_node(rule))
            .unwrap_throw();
        select.append_child(&option).unwrap_throw();

        if let Some(ref text) = unsafe { &LAST_SELECTION } {
            if text == rule {
                option.set_selected(true);
            }
        }
    }
}

#[wasm_bindgen]
pub fn lint(grammar: JsValue) -> JsValue {
    serde_wasm_bindgen::to_value(&compile_grammar(&grammar.as_string().unwrap()))
        .expect_throw("could not serialize grammar results")
}

#[wasm_bindgen(start)]
pub fn start() {
    listen_for_input();
}

#[wasm_bindgen]
pub fn format(grammar: JsValue) -> JsValue {
    let input = grammar.as_string().unwrap();
    let fmt = pest_fmt::Formatter::new(&input);
    serde_wasm_bindgen::to_value(&fmt.format().unwrap())
        .expect_throw("could not serialize grammar results")
}
