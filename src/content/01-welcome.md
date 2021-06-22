---
layout: post
title: 'Welcome to FuryStack'
author: [gallayl]
tags: ['Welcome']
image: img/furystack-logo-512.png
date: '2021-06-22T21:07:02.097Z'
draft: false
excerpt: The old site has been changed to Gatsby. Interested why?
---

## So, down with the old one...

I've opened up the old site to update some docs (and dependencies meanwhile...) and I've realized that I didn't touch the site since the last two years. Holy shit. There was even `tslint` instead of `eslint` in the project... So I've deicided if I have to touch it, I'll make a more professional approach.

## The requirements

The new site should be:
 - Easy to maintain. Maybe some .md files in some PR-s, that's all
 - SEO friendly 👉 static
 - Should be integrated into CI/CD
 - Easy-to-setup locally

## New kids on the block

So I've ~killed~ archived the old one and I have to make a replacement.
First, I've checked [Jekyll](https://jekyllrb.com/) - as the default approach for Github Pages it's easy to setup and deploy. We've used it in one of my previous workplace, it does the job pretty well.
The downside is that I'm not so familiar with Ruby, *gemfiles* and other esotheric things, so the stack is totally out of scope.

The next candidate is [GatsbyJS](https://www.gatsbyjs.com/) - I've found a great theme with Typescript support. I've updated all deprecated dependencies and it's still working. I'm familiar with the syntax. So far, so good. There are we now.

The next step will be setting up the CI/CD and migrating the docs from the old site.