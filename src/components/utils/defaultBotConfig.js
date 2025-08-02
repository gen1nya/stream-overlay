import {defaultTheme} from "../../theme";
import { mergeWith } from 'lodash';

export function mergeWithDefaults(config) {
    return mergeWith({}, defaultTheme, config, (objValue, srcValue) => {
        if (Array.isArray(srcValue)) {
            return srcValue;
        }
    });
}