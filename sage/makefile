.PHONY=build clean

build: clean
	sass --no-cache \
         --style=compressed \
         src/static/style.sass:src/static/style.css
	sass --no-cache \
         --style=compressed \
         src/static/sagecell_overrides.sass:src/static/sagecell_overrides.css


clean:
	-$(RM) src/static/style.css
	-$(RM) src/static/style.*.map
