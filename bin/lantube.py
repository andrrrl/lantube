#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Lantube CLI v. 0.2
# by Andrrr <andresin@gmail.com>
# CLI interface for Lantube server
# Small server/client for playing youtube videos from LAN
# Project: https://github.com/andrrrl/lantube
# Just for fun!

import sys
import subprocess
import os
import re
import urllib2
from lxml.html import parse


class YTSearch():

    def __init__(self):

		# Config Lantube server
		LANTUBE_SERVER = 'http://localhost:3000'
		
		# use this to pipe all output to dev/null
		FNULL = open(os.devnull, 'w')

		# print 'Lantube CLI' welcome message, version, etc
		self.welcome()

		# set default video quality
		video_quality = 'large'
		
		# video quality list
		quality_list = (
			'tiny', #144p: &vq=
			'small', #240p: &vq=
			'medium', #360p: &vq=
			'large', #480p: &vq=
			'hd720', #720p: &vq=
			'hd1080' #1080p:&vq=
		)

		# set default player option to "start at zero time" just to avoid empty option list (mplayer, mpv)
		player_options = '--start=00'

		if len(sys.argv) < 2:
			search = raw_input('Buscar en youtube: ')
		else:
			
			# If option is 'play', start playing video list and exit this script:
			if sys.argv[1] == 'play':
				print 'Playing full Lantube list...'
				
				if len(sys.argv) == 2:
					subprocess.call(['curl', LANTUBE_SERVER + '/api/videos/playlist'], stdout=FNULL, stderr=subprocess.STDOUT)
				else:
					order = sys.argv[2]
					subprocess.call(['curl', LANTUBE_SERVER + '/api/videos/' + order + '/play'], stdout=FNULL, stderr=subprocess.STDOUT)
				
				exit()
				
			# If option is 'stop', attempt to stop any playback
			if sys.argv[1] == 'stop':
				print 'Stopping any Lantube playback...'
				# Don't show output
				subprocess.call(['curl', LANTUBE_SERVER + '/api/videos/stop'], stdout=FNULL, stderr=subprocess.STDOUT)
				
				exit()
			
			# If help requested
			if sys.argv[1] == 'help':
				print 'Usage:'
				print '- Search & add video to Lantube (interactive): $ lantube.py'
				print '- Search & add video to Lantube (with args): $ lantube.py "my search terms" [quality=large]'
				print '- Play all current Lantube videos: $ lantube.py play'
				print '- Play Lantube video by list order: $ lantube.py play [n=number]'
				print '- Stop any playback: $ lantube.py stop'
				print ' '
				print '- List of available video qualities:'
				for quality in quality_list:
					print ' > ' + quality
			
				exit()
			
			# first arg is the search string [default action]
			search = sys.argv[1]

			# if more args are set...

			# second arg is youtube video quality to load
			
			# TODO: verify option
			if len(sys.argv) == 3:
				video_quality = sys.argv[2] or 'large'

			# third arg is player option [optional]
			# TODO: verify option
			if len(sys.argv) == 4:
				player_options = sys.argv[3]


		print "Searching videos for \"%s\" with quality [%s]..." % (search, video_quality)
		search = re.sub( ' ', '+', search )

		opener = urllib2.build_opener()
		opener.addheaders = [('User-agent', 'Mozilla/5.0 (X11; U; Linux i686) Gecko/20071127 Firefox/2.0.0.11')]
		url = opener.open('https://www.youtube.com/results?search_query=' + search)
		html = parse(url).getroot()

		# List search result
		i = 1
		links = []
		for link in html.cssselect('[rel=spf-prefetch]'): 
			links.append(link.get('href') + '&vq' + video_quality)
			print "%d - %s (youtube.com%s)" % (i, link.text_content(), link.get('href'))
			i+=1

		# Select video to add to Lantube
		select = raw_input('Add video to Lantube: ')

		# Post video to Lantube API
		lantube_add = subprocess.call(['curl', '--silent', LANTUBE_SERVER + '/api/videos', '-d', 'video=https://www.youtube.com' + links[int(select)-1] + '&order=last'], stdout=FNULL, stderr=subprocess.STDOUT)

		# Adding video...
		print 'Adding video...'

		# if process exited successfully (exit code 0)
		if lantube_add == 0:
			print 'done!'
			
			play_now = raw_input('Play now? S/n: ')

			if play_now == 's' or play_now == 'S':
				# Play!
				playing = subprocess.call(['curl', '--silent', LANTUBE_SERVER + '/api/videos/last/play'], stdout=FNULL, stderr=subprocess.STDOUT)
				if playing == 0:
					print 'Playing...'
			else:
				print 'Bye!'
		
		exit()


    def welcome(self):
		print '************************'
		print '* Lantube CLI v. 0.1.2 *'
		print '************************'

if __name__ == '__main__':
	YTSearch()
