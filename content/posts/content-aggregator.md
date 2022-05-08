---
title: "Writing My First Open Source Package - Content Aggregation CLI"
date: 2022-05-07T11:58:18+03:00
draft: true
tags: ["Aggregator", "Python", "CLI", "Open Source"]
categories: ["Open Source", "Project", "Python"]
---
## Introduction

A content aggregator is simply an application that gathers content from across the web in order to allow the user an consolidated way of consuming content.
A content aggregator can also save you a lot of time wasted on endless scrolling news feeds and getting distracted from random post on your reddit feed for example.

Content aggregation helps us optimize our content consumption — instead of scrolling through 5 different websites we only need a single one, and instead of endless scrolling trying to filter the content we care about, we can be presented with content related to our topics of interest immediately.

In this article, you will learn how to create your own customized content aggregator with python from scratch.

## Brief Detour

When writing this post, I had a minimal code example of a content aggregator that I planned to share with you, but while writing I had a thought of expanding it and eventually I even published it to PyPi as [my first open source package](https://pypi.org/project/Fuse-Con/).

Ideally, by the end of this post, you'd be able and would want to contribute to [Fuse](https://github.com/Eliran-Turgeman/Fuse) yourself.

## Prerequisites
* A local development environment for Python 3.7+
* Familiarity with Python.

## Step 1 - Installing Dependencies
In this step, you will install the modules that you will utilize later on. To do so, you will create a file that will hold the requirements for the entire project. 

The packages you are going to install are:
* feedparser - An RSS parsing module
* praw - Python Reddit API Wrapper module
* colorama - Enable colored terminal text
* typing - Adding support for type hints

Create a new file called `requirements.txt`.
Each line in this file will include the name of the package and the required version to install.
Copy the following requirements to your `requirements.txt` file

```
feedparser==6.0.8
praw==6.4.0
colorama==0.4.4
typing==3.6.2
```

To install all of the packages listed in the `requirements.txt` file, run the following command

```command
pip3 install -r requirements.txt 
```

In this step, you installed all the packages necessary for this tutorial.
Next, you will get a basic understanding of how the project is structured.


## Step 2 - High Level Design

In order to support various sources in a convinient way, we will create a base abstract class called `Source`.
Every source that we wish to add will inherit from it and extend its functionality.
In this post I am going to cover the `RedditSource` and `MediumSource`, both are subclasses of `Source`.

Lastly, we will have a `SourceManager` which will be given a list of sources and will trigger each source fetching mechanism.

In this step, you got a basic understanding of the project's structure.
Next, you will implement the base abstract class `Source`

## Step 3 - Implementing the Base Class

In this step, you will implement the base abstract class `Source`.

Open a new file called `models.py` and write the following code

```
from abc import ABC, abstractmethod

class Source(ABC):
    
    @abstractmethod
    def connect(self):
        pass

    @abstractmethod
    def fetch(self):
        pass
```

The above class has two functionalities - one is to connect to the source if needed (via API key for example) and a second one is to fetch content from the source.
The implementation will stay empty in this class and every specific source will have to implement the mentioned functionality.

In this step, you implemented the base abstract class `Source`.
Next, you will implement the `SourceManager` class.

## Step 4 - Implementing the Manager Class

In this step, you will implement the `SourceManager` class.

Open the file `models.py` and write the following code

```
...
from typing import List

...

class SourceManager:
    def __init__(self, sources: List[Source] = None) -> None:
        if not sources:
            self.sources = []
        else:
            self.sources = sources

    def __call__(self) -> None:
        for source in self.sources:
            source.fetch()
            print(source)

    def add(self, source: Source) -> None:
        self.sources.append(source)
```

As discussed in the high level design step, the `SourceManager` will get a list of sources, and upon calling it, the `SourceManager` will trigger each source `fetch` function and print the results.

There is also a function to add sources which is currently unused, but might be useful later on.

In this step, you implemented the `SourceManager` class and basically finished writing the wrapping of this application.
Next, you will learn how to fetch content from reddit and implement the `RedditSource` class.

## Step 5 - Implementing Reddit Source

In this step, you will implement the `RedditSource` class.

To start with, you will need to get an API key in order to use the `praw` library and query Reddit's API.
Here's a short guide on [Reddit's github](https://github.com/reddit-archive/reddit/wiki/OAuth2-Quick-Start-Example#first-steps) on how to do so - 
Make sure you have a client id and a client secret.

Once you have the client id and secret, add them as environment variables `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET`.

Now, create a new file called `reddit_source.py` and open it.
Let's first take care of the minimal necassary implementation which is defined by the `Source` class.

```
from models import Source, Result
from typing import List
import praw
from praw.reddit import Reddit
import os
from colorama import Fore, Style

CLIENT_ID = os.environ.get('REDDIT_CLIENT_ID')
CLIENT_SECRET = os.environ.get('REDDIT_CLIENT_SECRET')

class RedditSource(Source):

    def __init__(self, subreddit: str, limit: int = 10, metric: str = 'hot') -> None:
        self.results: List[Result] = []
        self.valid_metrics = ['hot', 'top']
        self.reddit_con = self.connect()
        self.subreddit = subreddit
        self.limit = limit
        self.metric = metric

    def connect(self) -> Reddit:
        self.reddit_con = praw.Reddit(client_id=CLIENT_ID,
                     client_secret=CLIENT_SECRET,
                     grant_type_access='client_credentials',
                     user_agent='script/1.0')
        return self.reddit_con


    def fetch(self) -> List[Result]: 
        if not self.subreddit or self.limit < 0 or self.metric.lower() not in self.valid_metrics:
            return
        
        if self.metric == 'hot':
            raw_results = self.reddit_con.subreddit(self.subreddit).hot(limit=self.limit)
        else:
            raw_results = self.reddit_con.subreddit(self.subreddit).top(limit=self.limit)

        self.results = self.reformat_results(raw_results) # will be defined soon

        return self.results
```

Let's go through the implementation briefly, starting with the `init` method, you will get a subreddit you wish to query, the metric you wish to query on which is either hot or top and a limit of results you want to see.

Inside the `init` function, we create a connection to Reddit's API via the praw library.
In order to create the connection, you should pass the client id and secret that you generated in the begining of this step.

Next, going over the `fetch` method, depending on the metric you got, you retrieve the matching results from `praw` using the connection object.

Lastly, we reformat the results from the API so that results across different sources will have a unified representation.

To create a unified representation, open the file `models.py` and add the following `Result` class

```
...
from colorama import Fore, Style

...
class Result:
    def __init__(self, title: str, url: str) -> None:
        self.title = title
        self.url = url

    def __repr__(self) -> str:
        return f"* \t {Fore.CYAN}{self.title}{Style.RESET_ALL}: {Fore.MAGENTA}{self.url} {Style.RESET_ALL} \n"
```

The above `Result` class simply gets the title and the url of the post we queried and prints it to the terminal using `colorama` module.

After creating the `Result` class, come back to the `reddit_source.py` file and finish the implementation of the `RedditSource` class.

```
class RedditSource(Source):
...
    def reformat_results(self, raw_results) -> List[Result]:
        reformatted_results = []
        for result in raw_results:
            reformatted_results.append(
                Result(
                    title=vars(result)['title'],
                    url=vars(result)['url']
                )
            )
        return reformatted_results


    def __repr__(self) -> str:
        output = f"{Fore.GREEN}Reddit Source Results [Sub: {self.subreddit}, Metric: {self.metric}]{Style.RESET_ALL} \n"
        for result in self.results:
            output += f"{result} \n"
        return output

```

The `reformat_results` function is responsible for taking the raw results given from the API and transforming it to the unified representation class you created earlier.

Lastly, by implementing the `__repr__` method, you can print all the results that you fetched and the implementation of the `RedditSource` is done.

In this step, you implemented the `RedditSource` class and created a unified representation for all different sources.
Next, you will get a taste of what's already implemented by executing the program.

## Step 6 - Executing Partial Implementation

In this step, you will execute what you have implemented so far.

To do so, create a file called `main.py` and use the following code.

```
from reddit_source import RedditSource
from models import SourceManager

if __name__ == '__main__':
    reddit_programming = RedditSource(subreddit='programming', limit=3, metric='hot')
    reddit_showerthoughts = RedditSource(subreddit='showerthoughts', limit=3, metric='top')
    
    source_manager = SourceManager([reddit_programming, reddit_showerthoughts])
    source_manager()
```

The above code simply creates two reddit sources, the first is for programming subreddit and the second for shower thoughts subreddit.
After creating these sources, we pass them as a list to the `SourceManager` and call it in order to execute the program.

Execute your program with 
```
python main.py
```

![Capture](https://user-images.githubusercontent.com/50831652/167283996-7da10955-b00b-4a88-9bdc-f9b9297fd2a7.JPG)


In this step, you executed what you implemented in the last 5 steps.
Next, you will add an additional source, which will be `Medium`.

