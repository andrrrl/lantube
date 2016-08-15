#!/usr/bin/env python
# -*- coding: utf-8 -*-

'''

Lantube Python CLI v. 0.1.2
by Andrrr <andresin@gmail.com>
CLI interface for Lantube, a small MEAN server/client app for playing youtube videos in a LAN
Project: https://github.com/andrrrl/lantube
*** Just for fun! ***

'''

import sys
import re
try:
    import urllib2
except ImportError:
    import urllib as urllib2

from lxml.html import parse


'''
Youtube search
Given some search terms, prints a list of youtube results
'''


class YTSearch():

    def __init__(self, args):

    	# set default video quality
    	self.video_quality = 'large'

    	# video quality list
    	self.quality_list = (
    		'tiny',  # 144p: &vq=
    		'small',  # 240p: &vq=
    		'medium',  # 360p: &vq=
    		'large',  # 480p: &vq=
    		'hd720',  # 720p: &vq=
    		'hd1080'  # 1080p:&vq=
    	)

    	if len(args) < 2:

    		# type in youtube search
    		self.search = raw_input('Youtube search: ')

    	else:

    		# first arg is the search string [default action]
    		self.search = args[1]

    		# second arg is video quality [optional]
    		if len(args) == 3:
    			self.video_quality = args[2] or 'large'


    	print "Searching videos for \"%s\" with quality [%s]..." % (self.search, self.video_quality)
    	self.search = re.sub(' ', '+', self.search)

    	opener = urllib2.build_opener()
    	opener.addheaders = [
    	    ('User-agent', 'Mozilla/5.0 (X11; U; Linux i686) Gecko/20071127 Firefox/2.0.0.11')]
    	url = opener.open('https://www.youtube.com/results?search_query=' + self.search)
    	self.html = parse(url).getroot()

    	self.print_links()


    def get_links(self):
    	return self.links

    def print_links(self):

        # List search result
    	i = 1
    	self.links = []
    	for link in self.html.cssselect('[rel=spf-prefetch]'):
    		self.links.append(link.get('href') + '&vq' + self.video_quality)
    		print "%d - %s (youtube.com%s)" % (i, link.text_content(), link.get('href'))
    		i += 1

if __name__ == '__main__':
    YTSearch(sys.argv).print_links()
