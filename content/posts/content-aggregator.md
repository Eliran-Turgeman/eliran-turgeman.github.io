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

## Step 1 - Installing dependencies
