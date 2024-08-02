import frappe

from shipengine_integration.doctype.shipping_label import (
	setup_custom_fields,
)


def execute():
    setup_custom_fields()
