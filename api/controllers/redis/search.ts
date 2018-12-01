import * as request from 'request-promise';
import * as libxml from 'libxmljs';

export class Search {

    public resultList = [];
    public videoList = [];
    durationList: libxml.Element[];
    imageList: libxml.Element[];

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

                console.log({ body });
                const html = libxml.parseHtmlString(body);
                this.resultList = html.find('//a[@rel="spf-prefetch"]');
                this.durationList = html.find('//span[@class="video-time"]');
                this.imageList = html.find('//span[@class="yt-thumb-simple"]');
                console.log(this.imageList);

                this.resultList.forEach((video, k) => {
                    this.videoList.push({
                        title: video.text(),
                        url: video.attr('href').value(),
                        duration: this.durationList[k].text(),
                        img: (this.imageList[k].get('img').attr('src').value().includes('https') ? this.imageList[k].get('img').attr('src').value() : this.imageList[k].get('img').attr('data-thumb').value())
                    });
                });

                return this.videoList;
            })
            .catch((err) => {
                console.log(err);
                return err;
            });
    }

}
