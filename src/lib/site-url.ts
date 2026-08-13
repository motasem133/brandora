/**
 * What a published site's own links have to look like from where the visitor
 * is standing.
 *
 * A site has two real addresses and they need different hrefs. On the
 * customer's own host — `theircompany.com` or `acme.brandora.enigmitic.com` —
 * the proxy rewrites `/about` onto `/sites/{host}/about`, so the page a visitor
 * asked for is `/about`, and a link to `/sites/acme/about` would be rewritten a
 * second time and 404. Reached inside the app at `/sites/acme`, the same link
 * has to carry that prefix.
 *
 * The host is what knows which world this is: a rewritten request always
 * arrives with the site's own hostname, so the segment matches either the whole
 * hostname (a custom domain) or its first label (a subdomain).
 *
 * Shared rather than local to the page because the sitemap and robots.txt have
 * to agree with the nav about where this site's pages are. A sitemap listing
 * URLs that 404 is worse than no sitemap.
 */
export function basePath(host: string | null, segment: string) {
  const hostname = (host ?? '').split(':')[0]
  const rewritten = hostname === segment || hostname.split('.')[0] === segment
  return rewritten ? '' : `/sites/${segment}`
}

/**
 * The absolute address of a page, for the things that are fetched by something
 * other than the visitor's browser: a share card, a sitemap, a crawler.
 *
 * `https` unconditionally. Every real address this product serves is behind
 * TLS — Vercel does not offer anything else, and a customer's attached domain
 * is verified before it resolves. On localhost the scheme is wrong and nothing
 * reads it: the harness looks at the paths.
 */
export function absoluteUrl(host: string | null, segment: string, page: string) {
  const path = page === 'home' ? `${basePath(host, segment)}/` : `${basePath(host, segment)}/${page}`
  return host ? `https://${host}${path}` : path
}
