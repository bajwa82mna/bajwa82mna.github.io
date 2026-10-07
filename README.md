# smbajwa.com

Static GitHub Pages site for Dr. Shoaib Munir and the site's browser-based research tools.

## Search ownership verification

Do not add placeholder or invented verification values. After obtaining each value from the relevant webmaster console, add the service's exact `<meta>` element to every indexable page head:

- Google Search Console: `google-site-verification`
- Bing Webmaster Tools: `msvalidate.01`
- Baidu Search Resource Platform: `baidu-site-verification`
- Yandex Webmaster: `yandex-verification`

Alternatively, use a provider-supported verification file when available. Keep verification secrets out of documentation and confirm deployed ownership after publishing.

## IndexNow

The site is IndexNow-ready through its canonical URLs and sitemap. Generate a key only through the official IndexNow workflow, host the matching key file at the required public path, and submit changed canonical URLs to an IndexNow endpoint. No key is shipped in this repository.
