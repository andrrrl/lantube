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
import urllib2
import json
from youtube import YTSearch


class Lantube():

	# Version
	LANTUBE_VERSION = '0.1.2'

	# Config Lantube server
	LANTUBE_SERVER = 'http://localhost:3000/api/videos'

	# use this to pipe all output to dev/null
	FNULL = open(os.devnull, 'w')

	# opener
	caller = urllib2.build_opener()

	def welcome(self):
		print '+----------------------+'
		print '|                      |-+'
		print '| Lantube CLI v.' + self.LANTUBE_VERSION + '  | |'
		print '|                      | |'
		print '+----------------------+ |'
		print ' +-----------------------+'

	def api_call(self, api_option, play_option=None):

		# API caller
		if play_option is not None: 
			play_option = play_option + '/' 
		else: 
			play_option = ''

		try: 
			api_result = self.caller.open(self.LANTUBE_SERVER + '/' + play_option + api_option)
			
			if api_option != 'stats':
				api_result = json.loads(api_result.read())

			return api_result

		except urllib2.HTTPError, e:
			print(str(e.code))
		except urllib2.URLError, e:
			print(str(e.reason) + '.')
			print('Lantube server down?')
		except Exception:
			import traceback
			print('Generic exception: ' + traceback.format_exc())
			
		exit()


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
			if len(args) == 2 and args[1] == 'stop':

				result = self.api_call('stop')
				if result['result'] is not None:
					print 'Result: [%s]' % result['result']
				
				exit()

			# If option is 'playlist', play generated PLS
			if len(args) == 2 and args[1] == 'playlist':

				result = self.api_call('playlist')
				if result['result'] is not None:
					print 'Result: [%s]' % result['result']
				
				exit()

			# If options is "list", show available videos to play
			if len(args) == 2 and args[1] == 'list':
				print 'List of current videos: '

				# Get list of videos
				videos = self.api_call('list')

				i = 1
				for video in videos:
					print '%d - %s (%s)' % (i, video['title'], video['url'])
					i = i + 1

				video_order = raw_input( 'Play a video from the list [1-' + str(i - 1) + ']: ')

				playing = self.api_call('play', video_order)

				if playing is not None:
					print 'Playing... %s' % videos[int(video_order) - 1].values()[4]

				exit()

			# Some stats
			if len(args) == 2 and args[1] == 'stats':
				print 'RAW Stats: '
				url_stats = self.api_call('stats')
				raw_stats = url_stats.readlines()

				stats = re.match(r"data:.*", raw_stats[2])

				if stats:
					stats = stats.group().replace('data:', '')

				json_stats = json.loads(stats)

				for index, stat_val in enumerate(json_stats):
					#print '- %s:\t\t%s' % stat_title, stat_val
					print "- %s: %s" % (stat_val, json_stats[stat_val])

				exit()

			# If help requested
			if len(args) == 2 and args[1] == 'help':
				print 'Usage:'
				print '- Search & add video to Lantube (interactive): $ python lantube.py'
				print '- Search & add video to Lantube (with args): $ python lantube.py "my search terms" [force quality, default=large]'
				print '- Play all current Lantube videos: $ python lantube.py playlist'
				print '- Play Lantube video by list order: $ python lantube.py play [n=number]'
				print '- Stop any playback: $ python lantube.py stop'
				print ' '
				print '- Available video qualities: '
				print ' (if quality not available, will use default)'
				for quality in quality_list:
					print ' > ' + quality

				exit()

		else:

			# If option is 'play', start playing video list and exit this script:
			if len(args) > 1 and args[1] == 'play':

				print 'Playing...'

				order = args[2]
				playing = self.api_call('play', order)

				exit()

		# Search!
		yt_links = YTSearch(args)
		yt_links.print_links()

		# Select video to add to Lantube
		select = raw_input('Add video to Lantube [1-' + str(len(yt_links.get_links())) + ']: ')

		# Post video to Lantube API
		lantube_add = subprocess.call(
			['curl', '--silent', self.LANTUBE_SERVER, '-d',
			'video=https://www.youtube.com' + yt_links.get_links()[int(select) - 1] + '&order=last'],
			stdout=self.FNULL, stderr=subprocess.STDOUT
		)

		# Adding video...
		print 'Adding video...'

		# if process exited successfully (exit code 0)
		if lantube_add == 0:

			print 'done!'

			play_now = raw_input('Play now? Y/n: ')

			if play_now == 'y' or play_now == 'Y':
				# Play!
				playing = self.api_call('play', 'last')

				print 'Playing...'

		print 'Bye!'
		exit()

if __name__ == '__main__':
	Lantube(sys.argv)
