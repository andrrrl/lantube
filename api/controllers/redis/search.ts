import * as request from 'request-promise';
import * as libxml from 'libxmljs';

export class Search {

    public resultList = [];
    public videoList = [];

    search(term) {

        this.videoList = [];

        let options = {
            url: 'https://www.youtube.com/results?search_query=' + term,
            json: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; U; Linux i686) Gecko/20071127 Firefox/2.0.0.11'
            }
        }

        return request(options)
            .then((body) => {
                const html = libxml.parseHtmlString(body);
                this.resultList = html.find('//a[@rel="spf-prefetch"]');

                this.resultList.forEach((video, k) => {
                    this.videoList.push({ title: video.text(), url: video.attr('href').value() });
                });

                return this.videoList;
            })
            .catch((err) => {
                console.log(err);
                return err;
            });
    }

}