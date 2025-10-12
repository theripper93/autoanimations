/**
 * Defines the main constants for module name and label.
 *
 * @type {{moduleId: string, moduleLabel: string}}
 */
const constants = {
   moduleId: "autoanimations",
   moduleLabel: "Automated Animations"
};

/**
 * @type {AASessionConstants} Defines all the module session storage static constants.
 */
const sessionConstants = {
   activeEffectAppState: `${constants.moduleId}.active-effect.app-state`,
   itemAppState: `${constants.moduleId}.item.app-state`,
   optionsInfoAppState: `${constants.moduleId}.options-info.app-state`,
   videoPreviewAppState: `${constants.moduleId}.video-preview.app-state`,
};

export { constants, sessionConstants };

/**
 * @typedef {object} AASessionConstants
 *
 * @property {string} activeEffectAppState - Stores the app state / position for AEMenuApp.
 *
 * @property {string} itemAppState - Stores the app state / position for ItemMenuApp.
 *
 * @property {string} optionsInfoAppState - Stores the app state / position of the OptionsInformation dialog.
 *
 * @property {string} videoPreviewAppState - Stores the app state / position of the VideoPreview dialog.
 */
