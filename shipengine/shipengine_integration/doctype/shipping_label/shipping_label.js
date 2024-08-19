// Copyright (c) 2024, p and contributors
// For license information, please see license.txt

// Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Shipping Label', {


	address_query: function (frm, link_doctype, link_name, is_your_company_address) {
		return {
			query: 'frappe.contacts.doctype.address.address.address_query',
			filters: {
				link_doctype: link_doctype,
				link_name: link_name,
				is_your_company_address: is_your_company_address
			}
		};
	},

	onload: function (frm) {
		frm.set_query("company_address", () => {
			return frm.events.address_query(frm, 'company', frm.doc['company_address_name'], 1);
		});
		frm.set_query("customer_address", () => {
			return frm.events.address_query(frm, 'customer', frm.doc['customer_address_name'], 0);
		});

		frm.set_query('customer_address_name', function () {
			return {
				filters: {
					'link_name': frm.doc.customer,
					'link_doctype': 'Customer'
				}
			};
		});

		frm.set_query('company_address_name', function () {
			return {
				filters: {
					'link_name': frm.doc.company,
					'link_doctype': 'Company',
					'address_type': 'Shipping'
				}
			};
		});


		if (frm.doc.docstatus === 0) {
			if (frm.doc.customer) {
				frm.events.set_collect(frm, frm.doc.customer)
			}
		}
		frm.fields_dict.shipping_options_html.$wrapper.html('');

	},
	refresh: function (frm) {
		$('div[data-fieldname=company_address] > div > .clearfix').hide();
		$('div[data-fieldname=customer_address] > div > .clearfix').hide();
		if (frm.doc.docstatus === 0) {
			/*
			frm.add_custom_button(__('Estimate Shipping Rate'), function () {
				get_shipping_rate_estimates(frm);
			});
			*/
		}

		if (frm.doc.docstatus === 1) {
			// Change the "Cancel" button to "Refund"
			if (frm.page.btn_secondary) {
				frm.page.btn_secondary[0].innerText = __('Refund');
			}
		}
	},

	after_save: function (frm) {
		// clear shipping options
		frm.fields_dict.shipping_options_html.$wrapper.html('');
	},

	before_save: function (frm) {
		// ensure that weight, length, height, and width are set
		if (!frm.doc.package_weight || !frm.doc.package_length || !frm.doc.package_width || !frm.doc.package_height) {
			// error
			frappe.msgprint({
				title: __('Error'),
				indicator: 'red',
				message: __('Please ensure that package weight, length, width, and height are greater than 0')
			});

			frappe.validated = false;
			return
		}

		// ensure that service code and carrier id are set
		if (!frm.doc.service_id || !frm.doc.carrier_id) {
			frappe.msgprint({
				title: __('Error'),
				indicator: 'red',
				message: __('Please select a shipping option')
			});
			frappe.validated = false;
			return
		}
	},

	package_height: function (frm) {
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}
	},
	package_width: function (frm) {
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}
	},
	package_length: function (frm) {
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}
	},
	package_weight: function (frm) {
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}
	},
	package_weight: function (frm) {
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}
	},
	package_weight_uom: function (frm) {
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}
	},
	package_size_uom: function (frm) {
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}
	},

	customer_address_name: function (frm) {
		erpnext.utils.get_address_display(frm, 'customer_address_name', 'customer_address', true);
		if (can_get_shipping_rate_estimates(frm)) {
			get_shipping_rate_estimates(frm);
		}

	},
	package_template: function (frm) {
		console.log(frm.doc.package_template)
		if (frm.doc.package_template) {
			frappe.db.get_doc('Shipment Parcel Template', frm.doc.package_template)
				.then(parcel_template => {
					//frm.set_value('package_weight_uom', parcel_template.weight_uom);
					frm.set_value('package_size_uom', parcel_template.size_uom);
					frm.set_value('package_length', parcel_template.length);
					frm.set_value('package_width', parcel_template.width);
					frm.set_value('package_height', parcel_template.height);
					//frm.set_value('package_weight', parcel_template.weight);
				})
				.catch(error => {
					console.error('Failed to fetch document:', error);
				});




		}
	},
	company_address_name: function (frm) {
		erpnext.utils.get_address_display(frm, 'company_address_name', 'company_address', true);
	},
	company: function (frm) {
		if (frm.doc.company) {
			frm.events.set_address_name(frm, 'Company', frm.doc.company, 1);
		}
	},
	customer: function (frm) {
		if (frm.doc.customer) {
			frm.events.set_address_name(frm, 'Customer', frm.doc.customer, 0);
			frm.events.set_collect(frm, frm.doc.customer)
		}
	},
	set_collect: function (frm, customer) {
		frappe.call({
			method: "shipengine.shipengine_integration.doctype.shipping_label.shipping_label.get_customer_collect_details",
			args: {
				customer_name: customer
			},
			callback: function (r) {
				if (r.message) {
					if (r.message.collect_account) {
						frm.set_value('collect_account_type', r.message.collect_account_type);
					}
					if (r.message.collect_account) {
						frm.set_value('collect_account', r.message.collect_account);
					}
					if (r.message.collect_postal_code) {
						frm.set_value('collect_postal_code', r.message.collect_postal_code);
					}
				}
			}
		});
	},



	set_address_name: function (frm, ref_doctype, ref_docname, isCompany) {
		frappe.call({
			method: "erpnext.stock.doctype.shipment.shipment.get_address_name",
			args: {
				ref_doctype: ref_doctype,
				docname: ref_docname
			},
			callback: function (r) {
				if (r.message) {
					if (isCompany) {
						frm.set_value('company_address_name', r.message);
					} else {
						frm.set_value('customer_address_name', r.message);
					}
				}
			}
		});
	},

});

function render_shipping_options(frm, shipping_options) {
	let html = `<h4>Select a Shipping Option </h4> ${frm.doc.collect_account ? "Third Party Billing Enabled" : ""} `;
	if (shipping_options) {
		shipping_options.forEach(function (option, index) {
			if (!option.shipping_amount) {
				return
			}
			html += `		
			<div class="shipping-option" data-service-code="${option.service_code}" data-carrier-id="${option.carrier_id}"  style="padding: 5px; border-bottom: 1px solid #ccc; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
			<div style="display: flex; align-items: center;">
				<input type="radio" name="shipping_option" value="${option.service_code}" style="margin-right: 10px;">
				<div>
					<strong>${option.service_type} ${option.package_type ? option.package_type : ""} (${option.delivery_days ? option.delivery_days : ""} day) </strong><br>
					<span>Estimated Delivery: ${option.carrier_delivery_days}</span>
				</div>
			</div>
			<div style="text-align: right;font-size:20px;font-weight:bolder;color:green">
				<span>$${option.shipping_amount.amount}</span>
			</div>
		 </div>`;
		});
	}
	frm.fields_dict.shipping_options_html.$wrapper.html(html);

	// Add click event to each shipping option
	$('.shipping-option').on('click', function () {
		let radioButton = $(this).find('input[name="shipping_option"]');
		let selected_option_code = radioButton.val();

		let serviceCode = $(this).data('service-code');
		let carrierId = $(this).data('carrier-id');

		radioButton.prop('checked', true);

		frm.set_value('service_id', serviceCode);
		frm.set_value('carrier_id', carrierId);
		// Remove highlight from all options
		$('.shipping-option').each(function () {
			// Reset inline styles
			$(this).css({
				'background-color': '',
				'border': ''
			});
		});

		// Highlight the selected option
		$(this).closest('.shipping-option').css({
			'background-color': '#f0f8ff', // Light blue color or any color you prefer
			'border': '1px solid #007bff' // Optional: border color for highlighted state
		});
	});
}

var fetching_rates = false
var can_get_shipping_rate_estimates = function (frm) {
	if (fetching_rates) {
		return false
	}
	return frm.doc.customer_address_name &&
		frm.doc.company_address_name &&
		frm.doc.package_weight &&
		frm.doc.package_weight_uom &&
		frm.doc.package_size_uom &&
		frm.doc.package_length &&
		frm.doc.package_width &&
		frm.doc.package_height;

}


var get_shipping_rate_estimates = function (frm) {
	if (fetching_rates) {
		return false
	}
	var msg = frappe.msgprint({
		title: __('Loading...'),
		indicator: 'blue',
		message: __('Fetching shipping rates')
	});

	let package_weight = frm.doc.package_weight;
	let package_weight_uom = frm.doc.package_weight_uom;
	let package_size_uom = frm.doc.package_size_uom;
	let package_length = frm.doc.package_length;
	let package_width = frm.doc.package_width;
	let package_height = frm.doc.package_height;
	let collect_account_type = frm.doc.collect_account_type;

	fetching_rates = true
	frappe.call({
		method: "shipengine.shipengine_integration.doctype.shipping_label.shipping_label.estimate_shipping_rates",
		args: {
			customer_address_name: frm.doc.customer_address_name,
			company_address_name: frm.doc.company_address_name,
			package_weight: package_weight,
			package_weight_uom: package_weight_uom,
			package_length: package_length,
			package_width: package_width,
			package_height: package_height,
			package_size_uom: package_size_uom,
			collect_account_type: collect_account_type
		},
		callback: function (r) {
			frappe.hide_msgprint(msg);
			fetching_rates = false
			if (r.message) {
				if (r.message.length > 0) {
					let item = r.message[0];
					if (item.error_messages.length > 0) {
						frappe.msgprint(item.error_messages[0])
						return
					}
				}
				if (r.message.errors) {
					frappe.msgprint(r.message.errors[0].message)
					return
				} else {
					render_shipping_options(frm, r.message)
					// make carrier id and service_code empty
					frm.set_value('service_id', '');
					frm.set_value('carrier_id', '');
				}
			}
		}
	});
}



var validate_duplicate = function (frm, table, fieldname, index) {
	return (
		table === 'shipment_delivery_note'
			? frm.doc[table].some((detail, i) => detail.delivery_note === fieldname && !(index === i))
			: frm.doc[table].some((detail, i) => detail.email === fieldname && !(index === i))
	);
};
