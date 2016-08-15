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
import subprocess
import os
import re
try:
	    import urllib2
except ImportError:
	    import urllib as urllib2
from lxml.html import parse
import json
from youtube import YTSearch


class Lantube():

	# Config Lantube server
	LANTUBE_SERVER = 'http://localhost:3000/api/videos'

	# use this to pipe all output to dev/null
	FNULL = open(os.devnull, 'w')

	def __init__(self, args):

		# print 'Lantube CLI' welcome message, version, etc
		self.welcome()

		# set default video quality
		video_quality = 'large'

		# video quality list
		quality_list = (
			'tiny',  # 144p: &vq=
			'small',  # 240p: &vq=
			'medium',  # 360p: &vq=
			'large',  # 480p: &vq=
			'hd720',  # 720p: &vq=
			'hd1080'  # 1080p:&vq=
		)

		if len(args) < 3:

			# If option is 'stop', attempt to stop any playback
			if args[1] == 'stop':
				print 'Stopping any Lantube playback...'
				# Don't show output
				subprocess.call(['curl', self.LANTUBE_SERVER + '/stop'],
				                stdout=self.FNULL, stderr=subprocess.STDOUT)

				exit()

			# If options is "list", show available videos to play

			if args[1] == 'list':
				print 'List of current videos: '

				videos = json.load(urllib2.urlopen(self.LANTUBE_SERVER))

				i = 1
				for video in videos:
					print '%d - %s (%s)' % (i, video['title'], video['url'])
					i = i + 1

				video_order = raw_input(
				    'Play a video from the list [1-' + str(i - 1) + ']: ')

				playing = subprocess.call(
					['curl', '--silent', self.LANTUBE_SERVER + '/' + video_order + '/play'],
					stdout=self.FNULL, stderr=subprocess.STDOUT
				)

				if playing == 0:
					print 'Playing... %s' % videos[int(video_order) - 1].values()[4]

				exit()

			# If help requested
			if args[1] == 'help':
				print 'Usage:'
				print '- Search & add video to Lantube (interactive): $ lantube.py'
				print '- Search & add video to Lantube (with args): $ lantube.py "my search terms" [quality=large]'
				print '- Play all current Lantube videos: $ lantube.py play'
				print '- Play Lantube video by list order: $ lantube.py play [n=number]'
				print '- Stop any playback: $ lantube.py stop'
				print ' '
				print '- List of available video qualities: '
				for quality in quality_list:
					print ' > ' + quality

				exit()

			# TODO: better stats
			if args[1] == 'stats':
				print 'RAW Stats: '
				raw_stats = urllib2.urlopen(self.LANTUBE_SERVER + '/stats')
				for stat in raw_stats:
					print stat
				exit()

		else:

			# If option is 'play', start playing video list and exit this script:
			if args[1] == 'play':

				print 'Playing...'

				if len(args) == 2:
					subprocess.call(
						['curl', self.LANTUBE_SERVER + '/playlist'],
						stdout=self.FNULL, stderr=subprocess.STDOUT
					)
				else:
					order = args[2]
					subprocess.call(
						['curl', self.LANTUBE_SERVER + '/' + order + '/play'],
						stdout=self.FNULL, stderr=subprocess.STDOUT
					)

				exit()

		# Search!
		yt_links = YTSearch(args).get_links()

		# Select video to add to Lantube
		select = raw_input('Add video to Lantube [1-' + str(len(yt_links)) + ']: ')

		# Post video to Lantube API
		lantube_add = subprocess.call(
			['curl', '--silent', self.LANTUBE_SERVER, '-d',
			'video=https://www.youtube.com' + yt_links[int(select) - 1] + '&order=last'],
			stdout=self.FNULL, stderr=subprocess.STDOUT
		)

		# Adding video...
		print 'Adding video...'

		# if process exited successfully (exit code 0)
		if lantube_add == 0:

			print 'done!'

			play_now = raw_input('Play now? S/n: ')

			if play_now == 's' or play_now == 'S':
				# Play!
				playing = subprocess.call(
					['curl', '--silent', self.LANTUBE_SERVER + '/last/play'],
					stdout=self.FNULL, stderr=subprocess.STDOUT
				)

				if playing == 0:
					print 'Playing...'

		print 'Bye!'
		exit()

	def welcome(self):
		print '************************'
		print '* Lantube CLI v. 0.1.2 *'
		print '************************'

if __name__ == '__main__':
	Lantube(sys.argv)
