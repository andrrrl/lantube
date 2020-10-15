import { exec } from 'child_process';

export class Search {

    public resultList = [];
    public videoList = [];

    search(term) {

        return new Promise((resolve, reject) => {
            term = term !== null ? term : process.argv[2];

            let yt = exec(`${process.env.YOUTUBE_DL} --default-search auto "ytsearch10: ${term}" --no-playlist --skip-download -J`);
            let list = '';

            yt.stdout.on('data', (data) => {
                list += data;
            });

            yt.stdout.once('end', () => {
                console.log(JSON.parse(list));
                const entries = JSON.parse(list).entries;
                this.videoList = entries.map(x => ({ title: x.title, url: x.id, duration: x.duration, img: x.thumbnail }));
                return resolve(this.videoList);
            });
        });

    }

}
