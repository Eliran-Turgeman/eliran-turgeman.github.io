---
title: "How To Build an API with Python FastAPI"
date: 2022-05-04T15:18:25+03:00
draft: false
tags: ["API", "FastAPI", "Python"]
categories: ["API", "Project", "Python"]
---

### Introduction

FastAPI is a relatively new and trending Python web framework for building APIs.
FastAPI's tag line includes its benefits over other popular web frameworks such as Flask and Django - "high performance, easy to learn, fast to code".

**Why FastAPI is faster?**

One of the main reasons FastAPI is faster, is that it utlizies Asyncronous Gateway Interface (ASGI) instead of Web Server Gateway Interface(WSGI).
WSGI is a long-standing Python standard for compatibility between web servers, frameworks, and applications, which is in the process of being replaced as the standard to ASGI.
In a nuteshell, ASGI can be faster than since WSGI can utilize a set of workers, and every worker can take care of a single request in a sequential manner while ASGI supports concurrency.
Read more about the differences between ASGI and WSGI in the [ASGI docs](https://asgi.readthedocs.io/en/latest/introduction.html)

<$>[note]**Note:** Django started supporting ASGI in version 3.0 (released in December 2019)
<$>

In this guide you will learn hands-on how to create a ready for production API with Python's FastAPI.
You will build a complete API, including a persistent database, while implementing all CRUD operations (Create, Read, Update, Delete).

By the end of this tutorial, you'll be able to create an API with a database from scratch using FastAPI.

## Prerequisites

To complete this tutorial, you will need:

* A local development environment for Python 3.6+ ([Setting up](https://www.digitalocean.com/community/tutorial_series/how-to-install-and-set-up-a-local-programming-environment-for-python-3))
* Familiarity with Python ([Python 3 guides](https://www.digitalocean.com/community/tutorial_series/how-to-code-in-python-3))
* Familiarity with APIs and HTTP Requests  ([API and HTTP guide](https://www.digitalocean.com/community/tutorials/getting-started-with-python-requests-get-requests))
* Familiarity with SQL ([SQL guide](https://www.digitalocean.com/community/tutorial_series/how-to-use-sql))
* [Kaggle](https://www.kaggle.com/) user

## Step 1 — Installing Dependencies
In this step, you will install the modules that you will utilize later on in the tutorial. To do so, you will create a file that will hold the requirements for the entire project. 

The packages you are going to install are:
* fastapi - The web framework you are going to work with
* uvicorn - An ASGI server implementation that will help us execute our API
* pydantic - A data validation module that you will use to enforce type checks
* typing - Adding support for type hints
* pathlib - Object-oriented filesystem paths that will help us manage our database
* pandas - Data analysis and manipulation tool that you will use to load our database
* requests - HTTP requests library
Create a new file called `requirements.txt`.
Each line in this file will include the name of the package and the required version to install.
Copy the following requirements to your `requirements.txt` file

```
fastapi==0.64.0
uvicorn==0.11.5
pydantic==1.8.1
typing==3.6.2
pathlib==1.0.1
pandas==1.3.0
requests==2.26.0
```

To install all of the packages listed in the `requirements.txt` file, run the following command

```command
pip3 install -r requirements.txt 
```

In this step, you installed all the packages necessary for this tutorial.
Next, you will get a quick taste of FastAPI, just to verify everything is ready before building our API.

## Step 2 — Creating a Hello World API

In this step, you are going to set up a minimal API and verify that our installations succeeded. Our minimal API is going to have a single API call which will simply greet the user upon accessing the root path of our API.

Create a file called `api.py` and open it in your editor.

```python
[label api.py]
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Hello World"}
```

In the above code snippet, you imported the  FastAPI module and created an instance of it called `app`.
Then, you declared a function called `root` that will be triggered whenever the user access the path "/" within our API.
By the decorator of this function, you can tell it implements a GET request, by the usage of `app.get` in the decorator.

This minimal API is going to serve us later on in the tutorial and will allow us to greet our users.
Note that the URL that is passed to `@app.get` is `"/"` which means that it will be the main page of our API.

In order to test that our API work, you should run the following command in your terminal.
The below command will deploy your application to your localhost using the module [`uvicorn`](https://www.uvicorn.org/), which is an ASGI server implementation.

```command
uvicorn api:app --reload
```

You should see the following output

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [28720]
INFO:     Started server process [28722]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

Open your browser and access the address specified in the output http://127.0.0.1:8000

If everything went as planned, you should be able to see a blank page with the message

```
{"message": "Hello World"}
```
You might want to use this API call that uses `"/"` as URL for a different purpose, but in the API you are going to build today, this URL will simply greet our users.

In this step, you created a minimal API and went through the process of executing it on our localhost.
Now you should be ready to start writing our complete API, but before you do, let's discuss what purpose our API is going to serve.

## Step 3 — Creating a database
The theme of our API to be Deep Sea Corals, and for that reason, I am going to use the following [Kaggle dataset](https://www.kaggle.com/noaa/deep-sea-corals) as our resource. Download the CSV file attached in the above link as it will be our dataset you will work with.

Before jumping into the code, you will need to do some thinking - "what do I want to achieve with this API?"

There can be many different ideas for your API purpose and operations you wish to allow, but for the sake of this tutorial you are going to focus on the following API capabilities

* Query a coral by identification
* Query a list of corals by their category
* Create a new coral
* Update an existing coral
* Delete a coral

After laying our plans down, you will now create the back-end of our back-end application which is obviously our database.

Our database implementation will relay on two components, or rather, files - `database.py` and `database_utils.py`.
In this step, you will focus on the `database_utils.py` file which will be responsible for handling the access to our database.
The second file, `database.py`, will be used on a later step.

Open the `database_utils.py` file and let's start coding, starting from the imports section.
These imports will include:

* `Path` which will help us determine if you have a .db file or you will have to create one.
* `sqlite3` which is the database library you will use in this tutorial.
* `pandas` which will help us convert the CSV file you downloaded into an sqlite database.

```python
[label database_utils.py]
from pathlib import Path
import sqlite3
import pandas as pd
```
Now, in order to "convert" our raw CSV dataset file into a sqlite3 database, you will have to perform the following actions

* Create a .db file
* Write the dataset into our .db file

I divided these tasks into a few functions, but before we get into those, make sure you have the following constants in your `database_utils.py` file.
The `DB_FILENAME` constant will store the name of our .db file that you will create.
The `COLUMNS` constant will store the names of the columns you wish to use from the dataset you have downloaded.
Note that our dataset is pretty large, so I chose a partial list out of the original columns that you will use.

```python
[label database_utils.py]
DB_FILENAME = "corals_db.db"

COLUMNS = ['catalog_number', 'data_provider', 'scientific_name',
        'vernacular_name_category', 'taxon_rank', 'station', 'observation_date',
        'latitude', 'longitude', 'depth']
```

Moving onto our first function, you will create a .db file.
The function below will check whether you have a .db file using the `Path` module, and if you don't - you will create one.

```python
[label database_utils.py]
...
def init_db(filename: str = DB_FILENAME) -> None:
    if not Path(filename).is_file():
        Path(filename).touch()
```

Next, you will use `pandas` in order to read the CSV file and convert it to our SQLite database file.

This function below, will utilize the `init_db` function you created above, to guarantee that you have a .db file and then, using the `sqlite3` and `pandas` modules you will create our database and a table within that database called `Corals`

```python
[label database_utils.py]
...
def load_csv_to_db() -> None:
    init_db(DB_FILENAME)
    conn = sqlite3.connect(DB_FILENAME)

    corals_data = pd.read_csv('deep_sea_corals.csv')
    
    # Dropping columns I am not intending to keep in the database
    corals_data.drop(['DepthMethod', 'Locality', 'LocationAccuracy', 'SurveyID',
                      'Repository', 'IdentificationQualifier', 'EventID',
                      'SamplingEquipment', 'RecordType', 'SampleID'], axis=1, inplace=True)
                    
    corals_data.columns = COLUMNS

    try:
        corals_data.to_sql('Corals', conn, if_exists='fail', index=False)
    except ValueError:
        print("Table already exists")
```

Another utility function that would be useful is one that will check if our table exists or not.
The function below will connect to our sqlite database and execute an SQL query which will result in either 0 or 1 in accordance to the existance of the `Corals` table in our database.

```python
[label database_utils.py]
...
def is_table_exists() -> bool:
    conn = sqlite3.connect(DB_FILENAME)
    cursor = conn.cursor()
    cursor.execute('''
    SELECT count(*) FROM sqlite_master WHERE type='table' AND name='Corals'
    ''')
    
    return cursor.fetchone()[0]
```

Now in order to bring everything together, you are going to create a context manager for our database, so you will be able to access it in a clean way without replicating code on every function that wishes to access the database.

```python
[label database_utils.py]
...
class CoralDatabase:
    def __init__(self, file=DB_FILENAME):
        self.file = file
        if not is_table_exists():
            load_csv_to_db()

    def __enter__(self):
        self.conn = sqlite3.connect(self.file)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        return self.cursor

    def __exit__(self, type, value, traceback):
        self.conn.commit()
        self.conn.close()
```

Now whenever you want to access our database, instead of setting up a connection, creating a cursor, etc, you can simply utilize our context manager with:
```python
 with CoralDatabase() as cursor:
...
```
<$>[note]
**Note:** The above snippet shouldn't be added to any file right now, it serves as an example of how you will use the context manager in later steps.
<$>


Whenever you will use this statement, the `__init__` and `__enter__` functions will be triggered. These functions are responsible for making sure that the `Corals` table exists and for setting up the connection to the database.

Then when you will be done with the .db file, the `__exit__` function will be triggered which will commit our changes and close the file.

<$>[note]
**Note:** If not for the context manager, every single function that accesses the database will have to provide the same functionality of setting up the conntection, commiting changes and closing the database which is just a horrible practice since there would be a lot of replicated code for every single access your application will make to the database.
<$>

Congratulations, you finished setting up our database utilities, next you will implement our API calls and database queries side by side.

## Step 4 - Implementing the API - GET Requests
In this step, you are going to start implementing our API calls, you will implement 2 different API calls which will allow us to retrieve a single coral by its catalog number, and retrieve a set of corals by their category.
For each of the API calls mentioned in step 3, you will create a database query and a matching API call that utilizes the query.

Create a file named `corals-api.py` and let's create our first API call.

First, let's take care of the imports section, some of the modules may seem unfamiliar but I will go over each and everyone once you get to use it.
Aside from FastAPI imports, you will use pydantic to create a model of the resource of our database - corals.
In addition, you will import starlette to use it's status codes so you would be able to return to the user a meaningful status code with every API call he makes.

```python
[label corals-api.py]
from fastapi import FastAPI, Path, status
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_404_NOT_FOUND,
    HTTP_409_CONFLICT
)
from database_utils import CoralDatabase
```

Next, you will create an API and CoralDatabase instances

```python
[label corals-api.py]
...
app = FastAPI()
db = CoralDatabase()
```

Our first API call would be very similar to the API call you implemented in step 2.

The following API call will simply greet our user in the same manner you already did.

```python
[label corals-api.py]
...
@app.get("/")
def root():
    return JSONResponse({'message': "Welcome to Corals-API"},
                        status_code=HTTP_200_OK)
```

Next, you will implement `get_coral_by_catalog_number` which will retrieve a coral information by its catalog number.

```python
[label corals-api.py]
...
@app.get("/coral/{catalog_number}")
def get_coral_by_catalog_number(catalog_number: int = Path(None, description="Catalog Number of the coral to retrieve")):
    coral = get_coral_by_catalog_number_db(catalog_number)
    return api_reply(coral)
```

At first glance, this function might seem unclear so let's break it down.

Firstly, you are using a `Path` object from the `fastapi` module which corresponds to a path parameter.

In the above API call, the variable `catalog_number` which is embedded in the URL of the request is called a path parameter, and you have a corresponding argument in our function arguments with the exact same name.

The parameters passed to the `Path` object include the default value of the parameter which I chose to be `None`, and the description of the parameter which gives an explanation to the user what kind of information he should input.

One mystery solved, two more mysteries to go.
What is `get_coral_by_catalog_number_db`? This is the database query that will return the coral information based on the catalog number provided.
Let's implement this function.

Create a `database.py` file, it will include all the database functions matching to our API calls.

```python
[label database.py]
...
from database_utils import CoralDatabase, DB_FILENAME

def get_coral_by_catalog_number_db(catalog_number: int) -> dict:
    with CoralDatabase(DB_FILENAME) as cursor:
        cursor.execute('''SELECT catalog_number, data_provider,
           scientific_name, vernacular_name_category, taxon_rank,
           observation_date, latitude, longitude, depth
           FROM Corals WHERE catalog_number = ?''',
                       (catalog_number,))
        return cursor.fetchone()
```
The above function will fetch a coral's information based on its catalog number while utilizing the context manager you created earlier.

Open the file `corals-api.py` and import the function you just implemented at the top of `corals-api.py`

```
[label corals-api.py]
...
from database import get_coral_by_catalog_number_db
...
```

The function `get_coral_by_catalog_number_db` will return an sqlite.Row object which will include all the information of the matching coral.

For example, just as an experiment, you can try and call `get_coral_by_catalog_number_db` from the bottom of `database.py` add these lines to run this function

```
[label database.py]
...
if __name__ == "__main__":
  output = get_coral_by_catalog_number_db(1)
  print(list(output))
```

Save `database.py`, go to your terminal and execute

```command
python3 database.py
```
when executing the script, while passing 1 as a catalog number, you will get the following output

```
[secondary_label Output]
[1.0, "Smithsonian Institution, National Museum of Natural History", "Pourtalosmilia conferta", stony coral (cup coral), species, "1964-04-14", "34.95839", "-75.32464", 146.0]
```
This experiment has concluded, remove the lines you just added to `database.py`.
This test was to check that the call you implemented worked, and also to show the need of formatting of the output which you will implement in the next function.

<!--3/1 Note Nice explanation here.-->After getting the results from the database query, you would want to "package" this result in some specific manner, normally in a JSON format, and then return the packaged result with a status code that will convey to the user if the API call was successful or that it encountered a problem during the request, for example when searching for a coral that is not in the database.

For the purpose of results packaging, I created a new file `api_utils.py`.

All API calls which are GET requests will have to return the user some packaged data. for that reason, I wrote a function called `api_reply` which gets the packaged result and returns it to the user in the form of a JSON.
The raw data is getting packaged in a second function called `prepare_result`.

First you will implement, `prepare_result`. 
Given a data from the database - which you saw was returned as a list, you will create a dictionary with the column names as keys and the matching data from the list as values.

```python
[label api_utils.py]
from fastapi.responses import JSONResponse
from starlette.status import (
    HTTP_200_OK,
    HTTP_404_NOT_FOUND,
    HTTP_409_CONFLICT
)

def prepare_result(data):
    if not isinstance(data, list):
        data = [data]
        
    result = {}
    for idx, entry in enumerate(data):
        result[idx] = {"CatalogNumber": entry[0],
                       "DataProvider": entry[1],
                       "ScientificName": entry[2],
                       "VernacularNameCategory": entry[3],
                       "TaxonRank": entry[4],
                       "ObservationDate": entry[5],
                       "Latitude": entry[6],
                       "Longitude": entry[7],
                       "Depth": entry[8]
                       }
    return result
```
Next, you will create `api_reply` which is simply wrapping `prepare_result` and returning a JSON from the dictionary you created at `prepare_result`, along with a matching status code describing whether the operation succeeded or failed.

```
[label api_utils.py]
...
def api_reply(data):
    if not data:
        return JSONResponse({'message': 'Coral Not Found'},
                            status_code=HTTP_404_NOT_FOUND)

    result = prepare_result(data)

    return JSONResponse({'message': 'Coral Found',
                         'data': result}, status_code=HTTP_200_OK)
```

Save and close the file.

Open the file `corals-api.py` and import the function you just implemented at the top of `corals-api.py`

```
[label corals-api]
...
from api_utils import api_reply
...
```

Following our previous experiment, if you call `prepare_result` with the output you got in the first experiment, you will receive the below output.
Similar to what you did in the first experiment, add these lines to the end of `corals-api.py'

```
[label corals-api.py]
...
if __name__ == "__main__":
  from api_utils import prepare_result
  output = get_coral_by_catalog_number_db(1)
  formatted_output = prepare_result(output)
  print(formatted_output)
```

Save `corals-api.py`, go to your terminal and execute

```command
python3 corals-api.py
```
when executing the script while passing 1 as a catalog number and calling the function that formats the results, you will get the following output

```
[secondary_label Output]
{0: {'CatalogNumber': 1.0, 'DataProvider': 'Smithsonian Institution, National Museum of Natural History', 'ScientificName': 'Pourtalosmilia conferta', 'VernacularNameCategory': 'stony coral (cup coral)', 'TaxonRank': 'species', 'ObservationDate': '1964-04-14', 'Latitude': '34.95839', 'Longitude': '-75.32464', 'Depth': 146.0}}
```

Then, the above dictionary will be passed into `api_reply` where it will be converted into JSON while adding a message and returning a status code.
To see the final output, you will call `api_reply` with the formated response as a parameter.

Delete the lines you just added to the end of `corals-api.py` and save your file.

In the end of `corals-api.py`, similar to our last test, write the below lines

```
[label corals-api.py]
...
if __name__ == "__main__":
  output = get_coral_by_catalog_number_db(1)
  reply = api_reply(output) 
  print(reply.body)
```

Save `corals-api.py`, go to your terminal and execute

```command
python3 corals-api.py
```
when executing the script while passing 1 as a catalog number and calling `api_reply` on the output, you will get the following output

```
[secondary_label Output]
{"message":"Coral Found","data":{"0":{"CatalogNumber":1.0,"DataProvider":"Smithsonian Institution, National Museum of Natural History","ScientificName":"Pourtalosmilia conferta","VernacularNameCategory":"stony coral (cup coral)","TaxonRank":"species","ObservationDate":"1964-04-14","Latitude":"34.95839","Longitude":"-75.32464","Depth":146.0}}}
```
The second experiment has concluded, delete the lines you just added to the end of `corals-api.py` and save your file.

Now that you got the hang of creating an API call, let's create a second one.

As we discussed in step 3, our next API call will be able to retrieve corals by their category.

Just as before, you will begin with the API call.
This API call is going to be pretty similar to the first one.

```python
[label corals-api.py]
@app.get("/coral-category/{coral_category}")
def get_coral_by_category(coral_category: str = Path(None, description="Category of corals you want to retrieve")):
    corals = get_coral_by_category_db(coral_category)
    return api_reply(corals)
```

Just as in the previous API call, you have a matching database query function, and usage of the packaging utility you already implemented.

The database query function will be pretty similar to the first one, the only variance would be the parameters by which you choose corals.

<$>[note]
**Note:** In the following function, you use `cursor.fetchall()` in order to retrieve all corals that meet the criteria, opposed to `cursor.fetchone()` you used earlier. 
<$>

```python
[label database.py]
def get_coral_by_category_db(coral_category: str) -> list:
    with CoralDatabase(DB_FILENAME) as cursor:
        cursor.execute('''SELECT catalog_number, data_provider,
           scientific_name, vernacular_name_category, taxon_rank,
           observation_date, latitude, longitude, depth
           FROM Corals WHERE vernacular_name_category = ?''',
                       (coral_category,))

        return cursor.fetchall()
```

Open the file `corals-api.py` and import the function you just implemented at the top of `corals-api.py`

```
[label corals-api]
...
from database import get_coral_by_category_db
...
```

This function concludes the GET requests you will implement for this API.
Obviously, there are a lot more functionalities you can add, and I encourage you to think of ways to extend this API.

Ideas for extending:

* Retrieve all corals that were found under a depth threshold
* Retrieve all corals reported by a specfic data provider
* Retrieve all corals that were found in a spefici radius from a given coordinates

In the next step, you will learn how to create POST requests, mainly used to create new resources, or in our case, new corals.

## Step 5 - Implementing the API - POST request
In this step, you are going to create new corals and add them to our database.
You will create a model of the resource of the API - a coral and learn how to allow to user to pass such a model to your API in order to add a new resource.

Before diving into the implementation of this API call, you will create a `Coral` class that will specify what attributes a coral resource consists of.

The coral resource class will inherit from `BaseModel` in the `pydantic` module which validates and enforces type hints at runtime.
Meaning that the class you will create will include type hints on the attributes, and in case a user inputs for example a string in the field of the coral catalog number you will get a user-friendly error.

The resource class of corals will include all the different columns you store in the database as follows

```python
[label corals-api.py]
class Coral(BaseModel):
    catalog_number: int
    data_provider: str
    scientific_name: str
    vernacular_name_category: str
    taxon_rank: str
    station: str
    observation_date: str
    latitude: str
    longitude: str
    depth: int
```

After creating our humble resource class, you can move on to implementing the API call which will add a new coral to the database.

The structure of the API call is going to be pretty similar. You simply use a database query function and return a response based on its result.

As opposed to other calls, you will alter our database, which means that you have to be cautious and think where things could go wrong so you prevent them.

For example, when creating a new coral, a user might decide to give the new coral an already assigned catalog number.
In this implementation, I chose not to allow this kind of behaviour and added a check that verifies the coral catalog number I am about to add to the database isn't already there.


```python
[label corals-api.py]
@app.post("/new-coral/{catalog_number}")
def create_coral(catalog_number: int, coral: Coral):
    if get_coral_by_catalog_number_db(catalog_number):
        return JSONResponse({'message': 'Catalog Number Already Exists'},
                            status_code=HTTP_409_CONFLICT)

    add_coral_to_db(catalog_number,
                    coral.data_provider,
                    coral.scientific_name,
                    coral.vernacular_name_category,
                    coral.taxon_rank,
                    coral.station,
                    coral.observation_date,
                    coral.latitude,
                    coral.longitude,
                    coral.depth)

    return JSONResponse({'message': 'Coral Created Successfully'},
                        status_code=status.HTTP_201_CREATED)
```

<$>[note]
**Note:** You utilized the database query function from a different API call in order to check if a coral with the given catalog number already exists in the database.
<$>


The only thing remaining to implement for this API call is the database function - `add_coral_to_db`

```python
[label database.py]
def add_coral_to_db(catalog_number: int, data_provider: str, scientific_name: str,
                     vernacular_name_category: str, taxon_rank: str, station: str,
                      observation_date: str, latitude: str, longitude: str, depth: int) -> None:
    with CoralDatabase(DB_FILENAME) as cursor:
        cursor.execute('''
        INSERT INTO Corals ('catalog_number', 'data_provider', 'scientific_name',
        'vernacular_name_category', 'taxon_rank', 'station', 'observation_date',
        'latitude', 'longitude', 'depth') VALUES (?,?,?,?,?,?,?,?,?,?)''',
         (catalog_number, data_provider, scientific_name, vernacular_name_category,
          taxon_rank, station, observation_date, latitude, longitude, depth))
```

Open the file `corals-api.py` and import the function you just implemented at the top of `corals-api.py`

```
[label corals-api]
...
from database import add_coral_to_db
...
```

In the next step, you will implement a PUT request which will allow us to update coral's information in our database.

## Step 6 - Implementing the API - PUT request
In this step, you will implement an API call which will allow the user to update a coral's data in our database.

<$>[note]
**Note:** This is not necessarily a behaviour you'd want to implement, at least not for every user. 
I am merely showing this for educational purposes.
<$>

After getting this out of the way, let's consider the implementation of the API call.

Like in the POST request API call you implemented, you will have to apply some verification to the user's request since he/she might ask to update a coral that's not in our database.

While writing this code, I was trying to be consistent so hopefully you already know how's this function is going to look like - a verification check that the coral you are trying to update exists, a database function which will take care of actually updating the information and a JSON response with a matching status code.

```python
[label corals-api.py]
@app.put("/update-coral/{catalog_number}")
def update_coral(catalog_number: str, coral: Coral):
    if not get_coral_by_catalog_number_db(catalog_number):
        return JSONResponse({'message': 'Coral Not Found'},
                            status_code=HTTP_404_NOT_FOUND)

    update_coral_db(catalog_number,
                coral.data_provider,
                coral.scientific_name,
                coral.vernacular_name_category,
                coral.taxon_rank,
                coral.station,
                coral.observation_date,
                coral.latitude,
                coral.longitude,
                coral.depth)

    return JSONResponse({'message': 'Coral Information Updated'},
                        status_code=status.HTTP_200_OK)
```

You already know what is coming next, let's dive into the database query function `update_coral_db`.

Since you want to allow the user to update certain fields but not others you will gradually set the new coral's information - one attribute for each query.

```python
[label database.py]
def update_coral_db(catalog_number_identifier: int,
                data_provider: str = None, scientific_name: str = None,
                vernacular_name_category: str = None, taxon_rank: str = None,
                station: str = None, observation_date: str = None, latitude: str = None,
                longitude: str = None, depth: int = None) -> None:

    params = [data_provider, scientific_name, vernacular_name_category,
                taxon_rank, station, observation_date, latitude, longitude,
                depth]
    params_names = ['data_provider', 'scientific_name', 'vernacular_name_category',
                    'taxon_rank', 'station', 'observation_date', 'latitude',
                    'longitude', 'depth']

    with CoralDatabase(DB_FILENAME) as cursor:
        for param, param_name in zip(params, params_names):
            if param and param != 'string':
                query = '''
                UPDATE Corals SET ''' + param_name + ''' = ? WHERE catalog_number = ?'''
                cursor.execute(query, (param, catalog_number_identifier))
```

Open the file `corals-api.py` and import the function you just implemented at the top of `corals-api.py`

```
[label corals-api]
...
from database import update_coral_db
...
```

That concludes the PUT request step which allows the user to modify the information of a coral by its catalog number.

The next step would be the last step of the implementation where you will learn how to implement a DELETE request.

## Step 7 - Implementing the API - DELETE request
In this step, you will implement our last API call, which will allow the user to delete a certain coral by its catalog number.

Bare in mind that the note I made on the last step is relevant here as well.
A reminder:
<$>[note]
**Note:** This is not necessarily a behaviour you'd want to implement, at least not for every user. 
I am merely showing this for educational purposes.
<$>

In this API call you would also want to verify the user's input since they might provide a coral catalog number that doesn't exist in our database, then delete the matching coral and return a JSON response with a matching status code.

```python
[label corals-api.py]
@app.delete("/delete-coral/{catalog_number}")
def delete_coral(catalog_number: str):
    if not get_coral_by_catalog_number_db(catalog_number):
        return JSONResponse({'message': 'Coral Not Found'},
                            status_code=HTTP_404_NOT_FOUND)

    delete_coral_db(catalog_number)

    return JSONResponse({'message': 'Coral Deleted Successfully'},
                        status_code=status.HTTP_200_OK)
```

One last time, let's take a look at the database query function, `delete_coral_db`.

```python
[label database.py]
def delete_coral_db(catalog_number: int) -> None:
    with CoralDatabase(DB_FILENAME) as cursor:
        cursor.execute('''
        DELETE FROM Corals WHERE catalog_number = ?''', (catalog_number,))
```

Open the file `corals-api.py` and import the function you just implemented at the top of `corals-api.py`

```
[label corals-api]
...
from database import delete_coral_db
...
```

That concludes the DELETE request for our API, and the implementation of our API.

In the next step you will shortly revisit how to run our API.

## Step 8 - Execute your API

To run your API, simply use the following command

```command
uvicorn corals-api:app --reload
```

Where 
* `corals-api` stands for the file containing the API calls.
* `app` stands for the variable name that holds the `FastAPI` object.
* `--reload` will reload the API whenever you save changes to your file.

Note that fastapi uses swagger for the UI, which means that once you run the above command, you could either access http://127.0.0.1:8000 and use the API in a manual fashion (typing out the URL or using other tools such as postman) or access http://127.0.0.1:8000/docs where you will have a convinent UI to execute all your API calls.

## Conclusion

In this article, you built an API including all CRUD operations completely from scratch. Now you can pick your own dataset and use cases and start implementing your own FastAPI from scratch.

