# query using graphQL and make it into a api
from fastapi import FastAPI
import uvicorn
import requests
import json
from pycoingecko import CoinGeckoAPI
cg = CoinGeckoAPI()


app = FastAPI()

# post request /getRev/{profileId}
@app.get("/getRev/{profileId}")
def getRevenue(profileId: str):
    # GraphQL query
    query = """
    query ProfileFollowRevenue {
      profileFollowRevenue(request: { profileId:""" + f'"{profileId}"' + """}) {
        revenues {
          total {
            asset {
              name
              symbol
              decimals
              address
            }
            value
          }
        }
      }
    }
    """
    headers = { "Content-Type": "application/json"}
    url = "https://api-mumbai.lens.dev/"
    r = requests.post(url, json={'query': query}, headers=headers)
    return calculate_token_value(eval(r.text))


@app.get("/getAllFollowRevs/{address}")
def get_all_handles(address: str):
    query = """
    query Profiles {
      profiles(
        request: {ownedBy: [""" + f'"{address}"' + """], limit: 50}
      ) {
        items {
          id
          }
      }
    }
    """
    print(query)
    headers = { "Content-Type": "application/json"}
    url = "https://api-mumbai.lens.dev/"
    r = requests.post(url, json={'query': query}, headers=headers)
    print(r.text)
    return search_all_handles_revs(eval(r.text)['data']['profiles']['items'])

def search_all_handles_revs(handle_list: list):
    rev = 0
    for handle in handle_list:
        rev += getRevenue(handle['id'])
    return rev*10**18

# calculate the total revenue
def calculate_token_value(ttl_rev):
    tokens = ttl_rev['data']['profileFollowRevenue']['revenues']
    # turn the tokens dict into a key-value map of token: value
    print(tokens)
    token_value = {token['total']['asset']['symbol']: float(token['total']['value']) for token in tokens}
    # get the price of each token
    total_value = 0
    for token in token_value.keys():
        if token == 'MATIC':
            token_id = 'matic-network'
        else:
            token_id = token.lower()
        endpoint = f'https://api.coingecko.com/api/v3/simple/price?ids={token_id}&vs_currencies=usd'
        response = eval(requests.get(endpoint).text)[token_id]['usd']
        total_value += token_value[token] * response
    # calculate the total value of the tokens
    # total_value = sum([token_value[token] * token_price[token]['usd'] for token in token_value])
    return total_value


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
    # test_dict = {"data":{"profileFollowRevenue":{"revenues":[{"total":{"asset":{"name":"Wrapped Matic","symbol":"MATIC","decimals":18,"address":"0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889"},"value":"561.0012"}},{"total":{"asset":{"name":"WETH","symbol":"WETH","decimals":18,"address":"0x3C68CE8504087f89c640D02d133646d98e64ddd9" },"value":"0.05"}}]}}}
    # print(calculate_token_value(test_dict))
