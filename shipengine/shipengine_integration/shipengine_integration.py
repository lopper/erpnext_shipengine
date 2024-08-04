base_url = "https://api.shipengine.com/v1"
import requests
import json
from dataclasses import dataclass

@dataclass
class Address:
    name: str
    company_name: str
    phone: str
    address_line1: str
    address_line2: str
    city_locality: str
    state_province: str
    postal_code: str
    country_code: str
    address_residential_indicator: str

@dataclass
class Weight:
    unit: str
    amount:float

@dataclass
class Dimensions:
    unit: str
    length: int
    width: int
    height: int

@dataclass
class BillTo:
    account: str
    postal_code: str
    country_code: str = "us"
    party: str = "third_party"

def get_shipping_rates(api_key, 
        carrier_ids, 
        from_country, 
        from_postal_code, 
        to_country, 
        to_postal_code, 
        to_city, 
        to_state, 
        weight:Weight, 
        dimensions:Dimensions):
    url = base_url + "/rates/estimate"
    
    headers = {
        'API-Key': api_key,
        'Content-Type': 'application/json'
    }
    
    payload = {
        "carrier_ids": carrier_ids,
        "from_country_code": from_country,
        "from_postal_code": from_postal_code,
        "to_country_code": to_country,
        "to_postal_code": to_postal_code,
        "to_city_locality": to_city,
        "to_state_province": to_state,
        "weight": {
            "value": weight.amount,
            "unit": weight.unit
        },
        "dimensions": {
            "unit": dimensions.unit,
            "length": dimensions.length,
            "width": dimensions.width,
            "height": dimensions.height
        }
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    
    return response.json()  # Return the response as a JSON object

def void_shipping_label(api_key, label_id):
    url = base_url + f"/labels/{label_id}/void"
    print(url)
    headers = {
        'API-Key': api_key,
        'Content-Type': 'application/json'
    }
    response = requests.put(url, headers=headers)
    # returns { 
    #   "approved": true
    #   "message" : "asdas"
    # }
    return response.json()  # Return the response as a JSON object

def get_shipping_label(api_key, 
        carrier_id,
        service_code, 
        external_shipment_id,
        ship_from:Address, 
        ship_to:Address,
        weight:Weight, 
        dimensions:Dimensions,
        referenceMessages:list = [],
        billTo:BillTo = None):
    url = base_url + "/labels"
    
    headers = {
        'API-Key': api_key,
        'Content-Type': 'application/json'
    }
    
    ship_to = {
                "company_name": ship_to.company_name,
                "name": ship_to.name,
                "phone": ship_to.phone,
                "address_line1": ship_to.address_line1,
                "address_line2": ship_to.address_line2,
                "city_locality": ship_to.city_locality,
                "state_province": ship_to.state_province,
                "postal_code": ship_to.postal_code,
                "country_code": ship_to.country_code,
                "address_residential_indicator": ship_to.address_residential_indicator
            }
    ship_to = {key: value for key, value in ship_to.items() if value and value != ""}

    ship_from = {
                "company_name": ship_from.company_name,
                "name": ship_from.name,
                "phone": ship_from.phone,
                "address_line1": ship_from.address_line1,
                "address_line2": ship_from.address_line2,
                "city_locality": ship_from.city_locality,
                "state_province": ship_from.state_province,
                "postal_code": ship_from.postal_code,
                "country_code": ship_from.country_code,
                "address_residential_indicator": ship_from.address_residential_indicator
            }
    ship_from = {key: value for key, value in ship_from.items() if value and value != ""}

    # iterate through referenceMessages and add to label_messages with key as reference1, reference2, etc.
    label_messages = {}
    for i, message in enumerate(referenceMessages):
        label_messages[f"reference{i+1}"] = message
    advanced_options = {}
    if billTo:
        advanced_options["bill_to_account"] = billTo.account
        advanced_options["bill_to_postal_code"] = billTo.postal_code
        advanced_options["bill_to_country_code"] = billTo.country_code
        advanced_options["bill_to_party"] = billTo.party

    payload = {
        "shipment": {
            "validate_address": "no_validation", # validate_none validate_and_clean
            "carrier_id": carrier_id,
            "service_code": service_code,
            #"external_shipment_id": external_shipment_id,
            "ship_to": ship_to,
            "ship_from": ship_from,
            "packages": [{
                "weight": {
                    "value": weight.amount,
                    "unit": weight.unit
                },
                "dimensions": {
                    "unit": dimensions.unit,
                    "length": dimensions.length,
                    "width": dimensions.width,
                    "height": dimensions.height
                },
                "label_messages": label_messages

            }],
            "advanced_options" : advanced_options
            
        }
    }
    
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    
    return response.json()  # Return the response as a JSON object

def get_carrier_services(api_key):
    url = base_url + "/carriers"
    
    headers = {
        'API-Key': api_key,
        'Content-Type': 'application/json'
    }
    response = requests.get(url, headers=headers)
    
    return response.json()  # Return the response as a JSON object