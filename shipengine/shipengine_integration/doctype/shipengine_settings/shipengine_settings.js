// Copyright (c) 2024, p and contributors
// For license information, please see license.txt

frappe.ui.form.on('Shipengine Settings', {
	refresh: function (frm) {
		if (frm.doc.is_enabled === 1) {
			frm.add_custom_button(__('Refresh Carriers'), function () {
				refresh_carriers(frm);
			});

		}
	}
});

function refresh_carriers(frm) {
	frappe.call({
		method: "shipengine.shipengine_integration.doctype.shipengine_settings.shipengine_settings.get_carriers",
		callback: function (r) {
			if (r.message) {
				// Clear existing rows in the child table
				frm.clear_table("carriers");

				// Iterate over the carriers and add them to the child table
				r.message.carriers.forEach(function (carrier) {
					let row = frm.add_child("carriers");
					frappe.model.set_value(row.doctype, row.name, "friendly_name", carrier.friendly_name);
					frappe.model.set_value(row.doctype, row.name, "carrier_code", carrier.carrier_code);
					frappe.model.set_value(row.doctype, row.name, "carrier_id", carrier.carrier_id);
				});

				// Refresh the table to show the added rows
				frm.refresh_field("carriers");


			} else {
				alert(r)
			}
		}
	});
}

