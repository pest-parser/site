#[macro_use]
extern crate stdweb;

use stdweb::traits::*;
use stdweb::web;
use stdweb::web::event::ClickEvent;

fn main() {
    let tree = web::document().query_selector(".editor-tree").unwrap().unwrap();

    let node = web::document().create_element("div").unwrap();
    node.class_list().add("node").unwrap();
    node.class_list().add("node-selected").unwrap();
    node.append_child(&web::document().create_text_node("digit"));
    let node_clone = node.clone();
    node.add_event_listener(move |_: ClickEvent| {
        js! {
            selected(@{&node_clone});
        }
    });

    tree.append_child(node.as_node());
}
