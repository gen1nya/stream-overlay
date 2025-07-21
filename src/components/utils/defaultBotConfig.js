import {defaultTheme} from "../../theme";
import merge from 'lodash.merge';

export function mergeWithDefaults(config) {
    return merge({}, defaultTheme, config || {});
}