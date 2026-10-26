import { debug } from "../constants.js";

export class AAAutorecFunctions {
   static rinseName(name) {
      return name?.replace(/\s+/g, "").toLowerCase();
   }

   static sortAndFilterMenus(menus) {
      const entries = Object.values(menus).flat().filter((e) => e?.label);
      entries.sort((a, b) => this.rinseName(b.label).length - this.rinseName(a.label).length);
      return {
         exactMatchMenus: entries.filter((x) => x.advanced?.exactMatch),
         bestMatchMenus: entries.filter((x) => !x.advanced?.exactMatch),
      };
   }

   static allMenuSearch(menus, rinsedName, trueName) {
      if (!rinsedName) { return false; }
      return menus.exactMatchMenus.find((x) => x.label === trueName)
         || menus.bestMatchMenus.find((x) => rinsedName.includes(this.rinseName(x.label))
            && !x.advanced?.excludedTerms?.some((term) => term && rinsedName.includes(this.rinseName(term))))
         || false;
   }

   static singleMenuSearch(menu, rinsedName, trueName) {
      if (!rinsedName) {
         debug("No Name was provided for the Global Menu search");
         return false;
      }
      const entries = Array.isArray(menu) ? menu : Object.values(menu).flat();
      return this.allMenuSearch(this.sortAndFilterMenus({ menu: entries }), rinsedName, trueName);
   }

   static singleMenuStrictSearch(menu, rinsedName) {
      if (!rinsedName) { return false; }
      return menu.find((x) => rinsedName === this.rinseName(x.label)) || false;
   }

   static checkExcludedProperty(item, property, path = "") {
      if (!path || !property || !item) { return false; }
      const value = foundry.utils.getProperty(item, path);
      if (typeof value !== "string") {
         debug("Invalid path for Excluded Item type", path);
         return false;
      }
      return this.rinseName(property) === this.rinseName(value);
   }
}
