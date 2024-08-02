frappe.ui.form.on('Delivery Note', {
    refresh: function (frm) {
        // Check conditions to show the button
        if (!frm.doc.is_return && frm.doc.status !== "Closed") {
            if (frm.doc.docstatus === 1) {
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
    }
});