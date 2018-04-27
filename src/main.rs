extern crate pest;
extern crate pest_meta;
extern crate pest_new;
extern crate pest_vm;
#[macro_use]
extern crate stdweb;

use std::collections::HashMap;

use pest::{Error, Position};
use pest_new::iterators::Pair;

use pest_meta::parser::{self, Rule};
use pest_meta::validator;

use pest_vm::Vm;

use stdweb::traits::*;
use stdweb::unstable::TryInto;
use stdweb::Value;
use stdweb::web;
use stdweb::web::event::InputEvent;
use stdweb::web::html_element::TextAreaElement;

static mut NEEDS_RUN: bool = false;
static mut VM: Option<Vm> = None;

fn listen_for_input() {
    let input = web::document().query_selector(".editor-input-text").unwrap().unwrap();

    input.add_event_listener(move |_: InputEvent| {
        unsafe { NEEDS_RUN = true; }
        wait_and_run();
    });
}

fn wait_and_run() {
    web::set_timeout(|| {
        if unsafe { NEEDS_RUN } {
            parse_input();
            unsafe { NEEDS_RUN = false; }
        }
    }, 800);
}

fn parse_input() {
    let input = web::document().query_selector(".editor-input-text").unwrap().unwrap();
    let output = web::document().query_selector(".editor-output").unwrap().unwrap();

    let input: TextAreaElement = input.try_into().unwrap();
    let output: TextAreaElement = output.try_into().unwrap();

    if let Some(rule) = selected_option() {
        let vm = unsafe { VM.as_ref().unwrap() };

        match vm.parse(&rule, &input.value()) {
            Ok(pairs) => {
                let lines: Vec<_> = pairs.map(|pair| {
                    format_pair(pair, 0)
                }).collect();
                let lines = lines.join("\n");

                output.set_value(&format!("{}", lines));
            }
            Err(error) => output.set_value(&format!("{}", error.renamed_rules(|r| r.to_string())))
        };
    }
}

fn format_pair(pair: Pair<&str>, indent_level: u32) -> String {
    let mut indent = String::new();

    for _ in 0..indent_level {
        indent.push_str("  ");
    }

    let children: Vec<_> = pair.clone().into_inner().collect();
    let len = children.len();
    let children: Vec<_> = children.into_iter().map(|pair| {
        format_pair(pair, if len > 1 { indent_level + 1 } else { 0 })
    }).collect();

    let dash = if indent_level == 0 {
        ""
    } else {
        "- "
    };

    match len {
        0 => format!("{}{}{}: {:?}", indent, dash, pair.as_rule(), pair.into_span().as_str()),
        1 => format!("{}{}{} > {}", indent, dash, pair.as_rule(), children[0]),
        _ => format!("{}{}{}\n{}", indent, dash, pair.as_rule(), children.join("\n"))
    }
}

fn selected_option() -> Option<String> {
    let select = web::document().query_selector(".editor-input-select").unwrap().unwrap();

    select.child_nodes().into_iter().find(|o| {
        let value = js! {
            return @{o}.selected;
        };

        if value != Value::Undefined {
            value.try_into().unwrap()
        } else {
            false
        }
    }).and_then(|o| o.text_content())
}

fn compile_grammar(grammar: String) -> Vec<HashMap<String, String>> {
    let result = parser::parse(Rule::grammar_rules, &grammar).map_err(|error| {
        error.renamed_rules(|rule| match *rule {
            Rule::grammar_rule => "rule".to_owned(),
            Rule::_push => "push".to_owned(),
            Rule::assignment_operator => "`=`".to_owned(),
            Rule::silent_modifier => "`_`".to_owned(),
            Rule::atomic_modifier => "`@`".to_owned(),
            Rule::compound_atomic_modifier => "`$`".to_owned(),
            Rule::non_atomic_modifier => "`!`".to_owned(),
            Rule::opening_brace => "`{`".to_owned(),
            Rule::closing_brace => "`}`".to_owned(),
            Rule::opening_paren => "`(`".to_owned(),
            Rule::positive_predicate_operator => "`&`".to_owned(),
            Rule::negative_predicate_operator => "`!`".to_owned(),
            Rule::sequence_operator => "`&`".to_owned(),
            Rule::choice_operator => "`|`".to_owned(),
            Rule::optional_operator => "`?`".to_owned(),
            Rule::repeat_operator => "`*`".to_owned(),
            Rule::repeat_once_operator => "`+`".to_owned(),
            Rule::comma => "`,`".to_owned(),
            Rule::closing_paren => "`)`".to_owned(),
            Rule::quote => "`\"`".to_owned(),
            Rule::insensitive_string => "`^`".to_owned(),
            Rule::range_operator => "`..`".to_owned(),
            Rule::single_quote => "`'`".to_owned(),
            other_rule => format!("{:?}", other_rule)
        })
    });

    let pairs = match result {
        Ok(pairs) => pairs,
        Err(error) => {
            add_rules_to_select(vec![]);
            return vec![convert_error(error)];
        }
    };

    if let Err(errors) = validator::validate_pairs(pairs.clone()) {
        add_rules_to_select(vec![]);
        return errors.into_iter().map(convert_error).collect();
    }

    let ast = match parser::consume_rules(pairs) {
        Ok(ast) => ast,
        Err(errors) => {
            add_rules_to_select(vec![]);
            return errors.into_iter().map(convert_error).collect();
        }
    };

    unsafe { VM = Some(Vm::new(ast.clone())); }

    add_rules_to_select(ast.iter().map(|rule| rule.name.as_str()).collect());

    js! {
        if (set_current_data) set_current_data();
    }

    parse_input();

    vec![]
}

fn convert_error(error: Error<Rule>) -> HashMap<String, String> {
    match error {
        Error::CustomErrorPos { message, pos } => {
            let mut map = HashMap::new();

            map.insert("from".to_owned(), line_col(&pos));
            map.insert("to".to_owned(), line_col(&pos));
            map.insert("message".to_owned(), format!("{}", message));

            map
        }
        Error::CustomErrorSpan { message, span } => {
            let mut map = HashMap::new();

            map.insert("from".to_owned(), line_col(&span.start_pos()));
            map.insert("to".to_owned(), line_col(&span.end_pos()));
            map.insert("message".to_owned(), format!("{}", message));

            map
        }
        _ => unreachable!()
    }
}

fn line_col(pos: &Position) -> String {
    let (line, col) = pos.line_col();
    format!("({}, {})", line - 1, col - 1)
}

fn add_rules_to_select(rules: Vec<&str>) {
    let select = web::document().query_selector(".editor-input-select").unwrap().unwrap();
    let parent = select.parent_node().unwrap();

    if rules.is_empty() {
        let new_select = web::document().create_element("select").unwrap();
        new_select.class_list().add("editor-input-select").unwrap();

        js! {
            @{&new_select}.disabled = true;
        }

        let option = web::document().create_element("option").unwrap();
        option.append_child(&web::document().create_text_node("..."));
        new_select.append_child(&option);

        parent.replace_child(&new_select, &select).unwrap();
    } else {
        let selected = selected_option();

        let new_select = web::document().create_element("select").unwrap();
        new_select.class_list().add("editor-input-select").unwrap();

        for rule in rules {
            let option = web::document().create_element("option").unwrap();
            option.append_child(&web::document().create_text_node(rule));
            new_select.append_child(&option);

            if let Some(ref text) = selected {
                if text == rule {
                    js! {
                        @{option}.selected = true;
                    }
                }
            }
        }

        parent.replace_child(&new_select, &select).unwrap();
    }
}

fn main() {
    listen_for_input();

    js! {
        window.lint = function (grammar) {
            var compile_grammar = @{compile_grammar};
            return compile_grammar(grammar);
        }
    }
}
