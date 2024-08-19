# Copyright (c) 2024, p and contributors
# For license information, please see license.txt

# import frappe
import frappe
from frappe import _
from frappe.model.document import Document
from shipengine.shipengine_integration.shipengine_integration import get_carrier_services
from shipengine.shipengine_integration.constants import (
	SETTING_DOCTYPE
)
class ShipengineSettings(Document):
	pass


@frappe.whitelist()
def get_carriers():
	shipengine_settings = frappe.get_doc(SETTING_DOCTYPE)
	if(not shipengine_settings.is_enabled):
		frappe.throw(_("Please enable ShipEngine Integration"))

	carriers = get_carrier_services(shipengine_settings.api_key)

	if carriers.get("errors"):
		frappe.throw(carriers.get("errors")[0].get("message"))
	else:
		return carriers

	
@frappe.whitelist()
def get_default_shipping_expense_account():
	shipengine_settings = frappe.get_doc(SETTING_DOCTYPE)
	if(not shipengine_settings.is_enabled):
		frappe.throw(_("Please enable ShipEngine Integration"))
	print(shipengine_settings.shipping_expense_acount)
	return shipengine_settings.shipping_expense_acount
	

