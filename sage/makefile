.PHONY=build clean sass

SASS=sass --no-cache --style=compressed

CSS  = $(filter-out src/static/_%.css,\
       $(patsubst %.sass,%.css,$(wildcard src/static/*.sass)))

build: $(CSS)

%.css: %.sass
	$(SASS) $<:$@

clean:
	-$(RM) $(CSS)
	-$(RM) $(patsubst %.css,%.css.map,$(CSS))
