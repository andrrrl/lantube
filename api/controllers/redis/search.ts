import * as yts from 'yt-search';

export class Search {

    public videoList = [];

    async search(term) {

        const resultList = await yts(term);

        return new Promise((resolve, reject) => {

            this.videoList = resultList.videos.map(video => ({
                title: video.title,
                url: video.url,
                duration: video.timestamp,
                img: video.thumbnail
            }));

            return resolve(this.videoList);
        });
    }

}
