
function populate_shipping_cost(frm, shipping_total, shipping_account_head) {

    // create or update row in sales taxes and charges with shipping cost
    // only do if doc type is in draft mode
    if (frm.doc.docstatus !== 0) {
        return
    }
    let shipping_charge = frm.doc.taxes.find(tax => tax.charge_type === "Actual" && tax.account_head === shipping_account_head)
    if (shipping_charge) {
        shipping_charge.tax_amount = shipping_total
        frm.refresh_field("taxes")
    } else {
        frm.add_child("taxes", {
            charge_type: "Actual",
            account_head: shipping_account_head,
            tax_amount: shipping_total
        })
        frm.refresh_field("taxes")
    }
    frm.trigger("calculate_taxes_and_totals");

}

let SHIPPING_ACCOUNT_HEAD = null
frappe.ui.form.on('Delivery Note', {
    refresh: function (frm) {
        // Check conditions to show the button
        if (!frm.doc.is_return && frm.doc.status !== "Closed") {
            if (frm.doc.docstatus === 0) {
                // Add custom button for Shipping Label
                frm.add_custom_button(__('Shipping Label'), function () {
                    // Define the function to generate the shipping label
                    // You can call a server-side method or handle it in the client script
                    frappe.model.open_mapped_doc({
                        method: "shipengine.shipengine_integration.doctype.shipping_label.shipping_label.make_shipping_label",
                        frm: frm
                    })

                }, __('Create'));
            }
        }
    },
    onload: function (frm) {

        // query for all shipping labels
        let shipping_cell = frm.fields_dict.shipping_labels || frm.fields_dict.custom_shipping_labels
        if (shipping_cell) {
            $(shipping_cell.wrapper).html("")
        }

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Shipping Label",
                filters: {
                    docstatus: 1,
                    delivery_note: frm.doc.name
                },
                fields: ["name", "tracking_number", "service_id", "shipment_cost", "collect_account"]
            },
            callback: function (r) {
                if (r.message && r.message.length > 0) {
                    // render infromation in custom_shipments_info field
                    let html = "<table class='table table-bordered'>";
                    let shipping_total = 0
                    html += "<tr><th>Label ID</th><th>Tracking Number</th><th>Service</th><th>Shipment Cost</th></tr>";
                    r.message.forEach((shipment) => {
                        let labelUrl = `/app/shipping-label/${shipment.name}`;
                        html += `<tr><td><a href="${labelUrl}">${shipment.name}</a><td>${shipment.tracking_number}</td><td>${shipment.service_id}</td><td>${shipment.collect_account ? "Third party" : shipment.shipment_cost}</td></tr>`;
                        shipping_total += parseFloat(shipment.shipment_cost)
                    });
                    html += "</table>";
                    if (shipping_cell) {
                        $(shipping_cell.wrapper).html(html)
                    }
                    if (SHIPPING_ACCOUNT_HEAD != null) {
                        populate_shipping_cost(frm, shipping_total, SHIPPING_ACCOUNT_HEAD)
                    } else {
                        //call get_default_shipping_expense_account
                        frappe.call({
                            method: "shipengine.shipengine_integration.doctype.shipengine_settings.shipengine_settings.get_default_shipping_expense_account",

                            callback: function (r) {
                                if (r.message) {
                                    SHIPPING_ACCOUNT_HEAD = r.message
                                    populate_shipping_cost(frm, shipping_total, SHIPPING_ACCOUNT_HEAD)
                                }
                            }
                        });
                    }

                }
            }
        });
    }
});