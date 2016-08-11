#!/usr/bin/env python
# -*- coding: utf-8 -*-

# Lantube CLI v. 0.1
# by Andrrr <andresin@gmail.com>
# CLI interface for Lantube server
# Small server/client for playing youtube videos from LAN
# Project: https://github.com/andrrrl/lantube
# Just for fun!

import sys
import subprocess
import os
import re
from lxml.html import parse

try:
    import urllib2
except ImportError:
    import urllib as urllib2


class YTSearch():

    def __init__(self):

		lantube_server = 'http://localhost:3000'

		# print 'Lantube CLI' welcome message
		self.welcome()

		# set default video quality
		video_quality = 'large'

		# set default player option to "start at zero time" just to avoid empty option list (mplayer, mpv)
		player_options = '--start=00'

		# modo de uso: python pytube.py | python pytube.py "mi búsqueda" [opciones
		# nativas de reporductor]

		if len(sys.argv) < 2:
			search = raw_input('Buscar en youtube: ')
		else:
			# first arg is the search string [required]
			search = sys.argv[1]

			# if more args are set...

			# second arg is youtube video quality to load
			if len(sys.argv) == 3:
				video_quality = sys.argv[2] or 'large'

			# third arg is player option [optional]
			if len(sys.argv) == 4:
				player_options = sys.argv[3]

			# video quality
			# 144p: &vq=tiny
			# 240p: &vq=small
			# 360p: &vq=medium
			# 480p: &vq=large
			# 720p: &vq=hd720
			# 1080p:&vq=hd1080

		print "Buscando videos de \"%s\" en calidad [%s]..." % (search, video_quality)
		print "[Usando TOR]"
		search = re.sub( ' ', '+', search )

		opener = urllib2.build_opener()
		opener.addheaders = [('User-agent', 'Mozilla/5.0 (X11; U; Linux i686) Gecko/20071127 Firefox/2.0.0.11')]
		url = opener.open('https://www.youtube.com/results?search_query=' + search)
		html = parse(url).getroot()

		# Listar resultado de búsqueda
		i = 1
		links = []
		for link in html.cssselect('[rel=spf-prefetch]'): 
			links.append(link.get('href') + '&vq' + video_quality)
			print "%d - %s (youtube.com%s)" % (i, link.text_content(), link.get('href'))
			i+=1

		select = raw_input('Agregar vídeo a Lantube: ')

		lantube_add = subprocess.call(['curl', '-d', 'video=https://www.youtube.com' + links[int(select)-1] + '&order=last', lantube_server + '/api/videos/add'])

		print 'Agregando video, esperá un choca...'

		if lantube_add == 0:
			print 'Video agregado!'
			play_now = raw_input('¿Reproducir ahora? s/n: ')

			if play_now == 's' or play_now == 'S':
				playing = process.call(['curl', lantube_server + '/api/videos/last/play'])
				if playing == 0:
					print 'Reproduciendo... SEA PACIENTE.'
					exit


    def welcome(self):
		print('Lantube CLI v. 0.1')

if __name__ == '__main__':
	YTSearch()
