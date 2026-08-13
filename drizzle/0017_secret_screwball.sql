-- What each page is called in the site's own menu.
--
-- The label only. A café's page of food was called "Services" because the page
-- vocabulary is fixed and shared with the URL, and renaming the slug instead
-- would break every link already shared and every entry already indexed — to
-- fix a word nobody types.
ALTER TABLE "website_assets" ADD COLUMN "page_titles" jsonb DEFAULT '{}'::jsonb NOT NULL;
