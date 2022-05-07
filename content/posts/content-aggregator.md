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
