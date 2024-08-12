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
        $(frm.fields_dict.shipping_labels.wrapper).html("")
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
                    html += "<tr><th>Label ID</th><th>Tracking Number</th><th>Service</th><th>Shipment Cost</th></tr>";
                    r.message.forEach((shipment) => {
                        let labelUrl = `/app/shipping-label/${shipment.name}`;
                        html += `<tr><td><a href="${labelUrl}">${shipment.name}</a><td>${shipment.tracking_number}</td><td>${shipment.service_id}</td><td>${shipment.collect_account ? "Third party" : shipment.shipment_cost}</td></tr>`;
                    });
                    html += "</table>";
                    if (frm.fields_dict.shipping_labels) {
                        $(frm.fields_dict.shipping_labels.wrapper).html(html)
                    }


                }
            }
        });
    }
});