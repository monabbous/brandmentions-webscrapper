# Brandmentions Webscraper

This is used to webscrape the free services of Brandmentions where you can use to search for posts on social media with keywords.

it uses this [https://app.brandmentions.com/research/hashtag-tracker/#page/search](link) 

### Usage

```cli
git clone https://github.com/monabbous/brandmentions-webscrapper.git
node app.js -q <query>
```

and it will output the result in json format in `results` directory.

for more information just run the command

```cli
    node app.js --help
```