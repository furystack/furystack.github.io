---
layout: post
title: 'Welcome to FuryStack, Gatsby 💙'
author: [gallayl]
tags: ['Welcome']
image: img/001-welcome-cover.jpg
date: '2021-06-23T08:38:20.257Z'
draft: false
excerpt: The old site has been changed to Gatsby. Interested why?
---

## So, down with the old one...

I've opened up the old site to update some docs (and dependencies meanwhile...) and I've realized that I didn't touch the site since the last two years. Holy shit 😭
There was even `tslint` instead of `eslint` in the project... So I've deicided if I have to touch it, I'll try to make a more professional approach.

## Times has changed and so the requirements

The new site should be:
 - Easy to maintain. Maybe some .md files in some PR-s, that's all. Simple and stupid, with no hassle
 - SEO friendly 👉 static. Had some issues in the past with [React Router and Github Pages](https://info340.github.io/client-side-routing.html)...
 - Should be integrated into CI/CD (that's still a ToDo 😊)
 - Easy-to-setup locally

## The new candidates

So I've ~killed~ archived the old one and I have to make a replacement. The old site was a react-based SPA. I could do the same with React or Shades but I still had to struggle with routes and SEO...

First, I've checked [Jekyll](https://jekyllrb.com/) - as the default approach for Github Pages it's easy to setup and deploy. We've used it in one of my previous workplace, it does the job pretty well.
The downside is that I'm not so familiar with Ruby, *gemfiles* and other esotheric things, so the stack is totally out of scope. So the templating syntax, theming and stuffs like these.

The next candidate is [GatsbyJS](https://www.gatsbyjs.com/) - I've found a great theme with Typescript support. I've updated all deprecated dependencies and it's still working. I'm familiar with the syntax. So far, so good. There are we now.

## What to expect

The plan is to publish announcements like new releases and features, some posts about concepts in FuryStack some techical stuff, development practices and dirty little tricks. But no promises how often will this happen 😉

## Coming out next

The next step will be setting up the CI/CD and migrating the docs from the old site (or maybe the main monorepo).