THEMES := $(wildcard */.)
THEMES_CLEAN := $(THEMES:%/.=%_clean)

.PHONY: all clean $(THEMES)

all: $(THEMES)

$(THEMES):
	$(MAKE) -C $@

clean: $(THEMES_CLEAN)

$(THEMES_CLEAN):
	$(MAKE) -C $(@:%_clean=%) clean
