# Copyright (c) 2024, p and contributors
# For license information, please see license.txt

# import frappe

import frappe
from frappe import _
from frappe.contacts.doctype.contact.contact import get_default_contact
from frappe.model.document import Document
from frappe.utils import flt, get_time
#from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
from shipengine.shipengine_integration.shipengine_integration import void_shipping_label, get_shipping_rates, get_shipping_label, Dimensions, Weight, BillTo, Address
from erpnext.accounts.party import get_party_shipping_address
from frappe.model.mapper import get_mapped_doc


from shipengine.shipengine_integration.constants import (
	SETTING_DOCTYPE
)

class ShippingLabel(Document):
	def validate(self):
		if self.docstatus == 0:
			self.status = "Draft"
	def before_cancel(self):
		shipengine_settings = frappe.get_doc(SETTING_DOCTYPE)
		label_id = self.label_id
		if not label_id:
			frappe.throw(_("Label_id is not set"))

		result = void_shipping_label(shipengine_settings.api_key, label_id)
		print(result)
		if result.get('errors'):
			frappe.throw(result["errors"][0]['message'])

		if result["approved"]:
			frappe.msgprint(result["message"])
		else:
			frappe.throw(result['message'])
			

	def on_submit(self):
		if flt(self.package_weight) <= 0:
			frappe.throw(_("Package weight cannot be 0"))
		if flt(self.package_length) <= 0:
			frappe.throw(_("Package length cannot be 0"))
		if flt(self.package_width) <= 0:
			frappe.throw(_("Package width cannot be 0"))
		if flt(self.package_height) <= 0:
			frappe.throw(_("Package height cannot be 0"))

		if not self.service_id:
			frappe.throw(_("Shipping option must be selected"))

		self.try_create_shipping_label()
		
		#self.db_set("status", "Submitted")
		
	def try_create_shipping_label(self):
		label = self.create_shipping_label()
		if not label.get('errors'):
			self.db_set("shipment_id", label['shipment_id'])
			self.db_set("label_id", label['label_id'])
			self.db_set("tracking_number", label['tracking_number'])
			self.db_set("shipment_cost", label['shipment_cost']['amount'])
			self.db_set("insurance_cost", label['insurance_cost']['amount'])
			self.db_set("label_pdf_url", label['label_download']['pdf'])
		else:
			frappe.throw(_("Error creating shipping label: {0}").format(label["errors"][0]["message"]))
	def on_update(self):
		pass

	
	def on_cancel(self):
		self.db_set("status", "Cancelled")

	def validate_weight(self):
		for parcel in self.shipment_parcel:
			if flt(parcel.weight) <= 0:
				frappe.throw(_("Parcel weight cannot be 0"))

	def create_shipping_label(self):
		# Fetch the customer document
		
		# get shipengine_settings
		shipengine_settings = frappe.get_doc(SETTING_DOCTYPE)

		# get customer_adddress
		customer_address = frappe.get_doc("Address", self.customer_address_name)

		# check that customer_address exists
		if not customer_address:
			frappe.throw(_("Customer address does not exist"))
		
		# get company_address
		company_address = frappe.get_doc("Address", self.company_address_name)

		if not company_address:
			frappe.throw(_("Company address does not exist"))

		# get country code from country
		customer_country = frappe.get_doc("Country", customer_address.country).code
		company_country = frappe.get_doc("Country", company_address.country).code

		referenceMessages = []
		if self.delivery_note:
			po_no = frappe.get_doc("Delivery Note", self.delivery_note).po_no	
			if po_no:
				referenceMessages.append("Purchase Order: " + po_no)
			referenceMessages.append("Delivery Note: " + self.delivery_note)

		# get customer name
		customer_name = frappe.get_doc("Customer", self.customer).customer_name
		# get company name
		company_name = frappe.get_doc("Company", self.company).company_name

		billTo = None
		if self.collect_account and self.collect_postal_code:
			billTo = BillTo(
				account=self.collect_account,
				postal_code=self.collect_postal_code)
		label = get_shipping_label(
			shipengine_settings.api_key, 
			self.carrier_id,
			self.service_id,
			"",
			Address(
				company_name="",
				name=company_name,
				phone=company_address.phone or ".",
				address_line1=company_address.address_line1,
				address_line2=company_address.address_line2,
				city_locality=company_address.city,
				state_province=company_address.state,
				postal_code=company_address.pincode,
				country_code=company_country,
				address_residential_indicator="unknown"
			),
			Address(
				company_name=self.customer_attention,
				name=customer_name,
				phone=customer_address.phone or ".",
				address_line1=customer_address.address_line1,
				address_line2=customer_address.address_line2,
				city_locality=customer_address.city,
				state_province=customer_address.state,
				postal_code=customer_address.pincode,
				country_code=customer_country,
				address_residential_indicator="unknown"
			),
			Weight(
				unit=self.package_weight_uom,
				amount=self.package_weight
			),
			Dimensions(
				unit=self.package_size_uom,
				length=self.package_length,
				width=self.package_width,
				height=self.package_height
			),
			referenceMessages,
			billTo

		)
		return label

@frappe.whitelist()
def get_address_name(ref_doctype, docname):
	# Return address name
	return get_party_shipping_address(ref_doctype, docname)


@frappe.whitelist()
def get_customer_collect_details(customer_name):
    # Fetch the customer document
    customer = frappe.get_doc("Customer", customer_name)
    
    # Extract the collect_account and collect_postal_code fields
    collect_account = customer.get("collect_account")
    collect_postal_code = customer.get("collect_postal_code")
    
    # Return the collected details
    return {
        "collect_account": collect_account,
        "collect_postal_code": collect_postal_code
    }




@frappe.whitelist()
def estimate_shipping_rates(
	customer_address_name, 
	company_address_name, 
	package_weight, 
	package_weight_uom,
	package_length, 
	package_width, 
	package_height,
	package_size_uom):
    # Fetch the customer document
	
	shipengine_settings = frappe.get_doc(SETTING_DOCTYPE)
	if(not shipengine_settings.is_enabled):
		frappe.throw(_("Please enable ShipEngine Integration"))


	# get customer_adddress
	customer_address = frappe.get_doc("Address", customer_address_name)
    
	# get company_address
	company_address = frappe.get_doc("Address", company_address_name)

	customer_country = frappe.get_doc("Country", customer_address.country).code
	company_country = frappe.get_doc("Country", company_address.country).code

	dimensions = Dimensions(
		unit=package_size_uom,
		length=package_length,
		width=package_width,
		height=package_height
	)
	weight = Weight(
		unit=package_weight_uom,
		amount=package_weight
	)
    
	# get shipengine_settings
	shipengine_settings = frappe.get_doc(SETTING_DOCTYPE)
	carrier_ids = shipengine_settings.carrier_ids.split("\n")

	rates = get_shipping_rates(
		shipengine_settings.api_key, 
		carrier_ids,
		company_country, 
		company_address.pincode, 
		customer_country, 
		customer_address.pincode, 
		customer_address.city, 
		customer_address.state, 
		weight,
		dimensions
	)
	return rates



@frappe.whitelist()
def make_shipping_label(source_name, target_doc=None):

	shipengine_settings = frappe.get_doc(SETTING_DOCTYPE)
	if(not shipengine_settings.is_enabled):
		frappe.throw(_("Please enable ShipEngine Integration"))

	def postprocess(source, target):
		if source.shipping_address_name:
			target.delivery_address_name = source.shipping_address_name
			target.delivery_address = source.shipping_address
		elif source.customer_address:
			target.delivery_address_name = source.customer_address
			target.delivery_address = source.address_display

	doclist = get_mapped_doc(
		"Delivery Note",
		source_name,
		{
			"Delivery Note": {
				"doctype": "Shipping Label",
				"field_map": {
					"company": "company",
					"company_address": "company_address_name",
					"customer": "customer",
					"shipping_address_name": "customer_address_name",
					"name" : "delivery_note",
					"shipping_address": "customer_address",
					"company_address_display": "company_address",
				},
				"validation": {"docstatus": ["=", 0]},
			}
		},
		target_doc,
		postprocess,
	)

	return doclist


def create_custom_fields(custom_fields):
    for doctype, fields in custom_fields.items():
        # Retrieve existing custom fields for the doctype
        existing_fields = frappe.get_all('Custom Field', filters={'dt': doctype}, fields=['fieldname'])
        existing_fieldnames = {field['fieldname'] for field in existing_fields}
        
        for field in fields:
            fieldname = field.get('fieldname')
            
            if fieldname not in existing_fieldnames:
                try:
                    # Create the custom field
                    frappe.get_doc({
                        'doctype': 'Custom Field',
                        'dt': doctype,
                        'fieldname': fieldname,
                        'label': field.get('label'),
                        'fieldtype': field.get('fieldtype'),
                        'insert_after': field.get('insert_after'),
                        'insert_before': field.get('insert_before'),
                        'options': field.get('options')
                    }).insert()
                    
                    print(f"Created custom field '{fieldname}' in '{doctype}'")
                
                except Exception as e:
                    print(f"Error creating custom field '{fieldname}' in '{doctype}': {e}")
            else:
                print(f"Field '{fieldname}' already exists in '{doctype}'")


def setup_custom_fields():
	custom_fields = {
		"Customer": [
			dict(
				fieldname="collect_account_type",
				label="Collect Account Type",
				fieldtype="Link",
				options="Collect Account Type",
				insert_after="customer_group"
			),

			dict(
				fieldname="collect_account",
				label="Collect Account Number",
				fieldtype="Data",
				insert_after="collect_account_type"
			),
			dict(
				fieldname="collect_postal_code",
				label="Collect Postal Code",
				fieldtype="Data",
				insert_after="collect_account"
			)
		],
		"Delivery Note": [
			dict(
				fieldname="shipping_labels",
				label="Shipping Labels",
				fieldtype="HTML",
				insert_before="taxes_section"
			),
		],
		"Shipment Parcel Template": [
			dict(
				fieldname="weight_uom",
				label="Weight UOM",
				fieldtype="List",
				options="Pound\nOunce",
				insert_after="weight"
			),
			dict(
				fieldname="size_uom",
				label="Size UOM",
				fieldtype="List",
				options="Inch\nCentimeter",
				insert_after="weight_uom"
			)
		]
	}
	create_custom_fields(custom_fields)