import { showAutorecMenu } from './showUI.js'

export default class AutorecShim extends FormApplication
{
   /**
    * Disable Foundry v13+ warnings for AppV1.
    *
    * @type {boolean}
    * @internal
    */
   static _warnedAppV1 = true;

   /**
    * @inheritDoc
    */
   constructor(options = {})
   {
      super({}, options);

      showAutorecMenu();
   }

   async _updateObject(event, formData) {}
   render() { this.close(); }
}
