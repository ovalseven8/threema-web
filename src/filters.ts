/**
 * This file is part of Threema Web.
 *
 * Threema Web is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero
 * General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Threema Web. If not, see <http://www.gnu.org/licenses/>.
 */

import {escapeRegExp, filter} from './helpers';
import {MimeService} from './services/mime';
import {WebClientService} from './services/webclient';

angular.module('3ema.filters', [])

/**
 * Escape HTML by replacing special characters with HTML entities.
 */
.filter('escapeHtml', function() {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return (text: string) => {
        if (text === undefined || text === null) {
            text = '';
        }
        return text.replace(/[&<>"']/g, (m) => map[m]);
    };
})

/**
 * Replace newline characters with a <br> tag.
 */
.filter('nlToBr', function() {
    return (text, enabled: boolean) => {
        if (enabled || enabled === undefined) {
            text = text.replace(/\n/g, '<br>');
        }
        return text;
    };
})

/**
 * Replace a undefined/null or empty string with a placeholder
 */
.filter('emptyToPlaceholder', function() {
    return (text, placeholder: string = '-') => {
        if (text === null || text === undefined || text.trim().length === 0) {
            return placeholder;
        }
        return text;
    };
})

/**
 * Convert links in text to <a> tags.
 */
.filter('linkify', function() {
    const autolinker = new Autolinker({
        // Open links in new window
        newWindow: true,
        // Don't strip protocol prefix
        stripPrefix: false,
        // Don't truncate links
        truncate: 99999,
        // Add class name to linked links
        className: 'autolinked',
        // Link urls
        urls: true,
        // Link e-mails
        email: true,
        // Don't link phone numbers (doesn't work reliably)
        phone: false,
        // Don't link twitter handles
        twitter: false,
        // Don't link hashtags
        hashtag: false,
    });
    return (text) => autolinker.link(text);
})

/**
 * Convert emoji unicode characters to images.
 * Reference: http://git.emojione.com/demos/latest/index.html#js
 *
 * Set the `imgTag` parameter to `true` to use inline PNGs instead of sprites.
 */
.filter('emojify', function() {
    return function(text, imgTag = false, greedyMatch = false) {
        if (text !== null) {
            emojione.sprites = imgTag !== true;
            emojione.emojiSize = '32';
            emojione.imagePathPNG = 'img/e1/';
            emojione.greedyMatch = greedyMatch;
            return emojione.unicodeToImage(text);
        } else {
            return text;
        }
    };
})

/**
 * Convert markdown elements to html elements
 */
.filter('markify', function() {
    return function(text) {
        if (text !== null) {
            text = text.replace(/\B\*([^\r\n]+?)\*\B/g, '<span class="text-bold">$1</span>');
            text = text.replace(/\b_([^\r\n]+?)_\b/g, '<span class="text-italic">$1</span>');
            text = text.replace(/\B~([^\r\n]+?)~\B/g, '<span class="text-strike">$1</span>');
            return text;
        }
        return text;
    };
})

/**
 * Convert mention elements to html elements
 */
.filter('mentionify', ['WebClientService', '$translate', 'escapeHtmlFilter',
    function (webClientService: WebClientService, $translate: ng.translate.ITranslateService, escapeHtmlFilter) {
        return(text) => {
            if (text !== null && text.length > 10) {
                let result = text.match(/@\[([\*\@a-zA-Z0-9][\@a-zA-Z0-9]{7})\]/g);
                if (result !== null) {
                    result = ([...new Set(result)]);
                    // Unique
                    for (let possibleMention of result) {
                        let identity = possibleMention.substr(2, 8);
                        let mentionName;
                        let cssClass;
                        if (identity === '@@@@@@@@') {
                            mentionName = $translate.instant('messenger.ALL');
                            cssClass = 'all';
                        } else if (identity === webClientService.me.id) {
                            mentionName = webClientService.me.displayName;
                            cssClass = 'me';
                        } else {
                            const contact = webClientService.contacts.get(possibleMention.substr(2, 8));
                            if (contact !== null) {
                                // Add identity to class for a simpler parsing
                                cssClass = 'id ' + identity;
                                mentionName = contact.displayName;
                            }
                        }

                        if (mentionName !== undefined) {
                            text = text.replace(
                                new RegExp(escapeRegExp(possibleMention), 'g'),
                                '<span class="mention ' + cssClass + '"'
                                    + ' text="@[' + identity + ']">' + escapeHtmlFilter(mentionName) + '</span>',
                            );
                        }
                    }
                }
            }
            return text;
        };
}])
/**
 * Reverse an array.
 */
.filter('reverse', function() {
    return (list) => list.slice().reverse();
})

/**
 * Return whether receiver has corresponding data.
 */
.filter('hasData', function() {
    return function(obj, receivers) {
        const valid = (receiver) => receivers.get(receiver.type).has(receiver.id);
        return filter(obj, valid);
    };
})

/**
 * Return whether item has a corresponding contact.
 */
.filter('hasContact', function() {
    return function(obj, contacts) {
        const valid = (item) => contacts.has(item.id);
        return filter(obj, valid);
    };
})

/**
 * Return whether contact is not me.
 */
.filter('isNotMe', ['WebClientService', function(webClientService: WebClientService) {
    return function(obj: threema.Receiver) {
        const valid = (contact: threema.Receiver) => contact.id !== webClientService.receivers.me.id;
        return filter(obj, valid);
    };
}])

/**
 * Filter for duration formatting.
 */
.filter('duration', function() {
    return function(seconds) {
        const left = Math.floor(seconds / 60);
        const right = seconds % 60;
        const padLeft = left < 10 ? '0' : '';
        const padRight = right < 10 ? '0' : '';
        return padLeft + left + ':' + padRight + right;
    };
})
.filter('bufferToUrl', ['$sce', '$log', function($sce, $log) {
    const logTag = '[filters.bufferToUrl]';
    return function(buffer: ArrayBuffer, mimeType: string, trust: boolean = true) {
        if (!buffer) {
            $log.error(logTag, 'Could not apply bufferToUrl filter: buffer is', buffer);
            return '';
        }
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const uri = 'data:' + mimeType + ';base64,' +  btoa(binary);
        if (trust) {
            return $sce.trustAsResourceUrl(uri);
        } else {
            return uri;
        }
    };
}])
.filter('mapLink', function() {
    return function(location: threema.LocationInfo) {
        return 'https://www.openstreetmap.org/?mlat='
            + location.lat + '&mlon='
            + location.lon;
    };
})
/**
 * Convert message state to material icon class.
 */
.filter('messageStateIcon', function() {
    return (message: threema.Message) => {
        if (!message) {
            return '';
        }

        if (!message.isOutbox) {
            switch (message.state) {
                case 'user-ack':
                    return 'thumb_up';
                case 'user-dec':
                    return 'thumb_down';
                default:
                    return 'reply';
            }
        }
        switch (message.state) {
            case 'pending':
            case 'sending':
                return 'file_upload';
            case 'sent':
                return 'email';
            case 'delivered':
                return 'move_to_inbox';
            case 'read':
                return 'visibility';
            case 'send-failed':
                return 'report_problem';
            case 'user-ack':
                return 'thumb_up';
            case 'user-dec':
                return 'thumb_down';
            default:
                return '';
        }
    };
})
.filter('fileSize', function() {
    return (size: number) => {
        if (!size) {
            return '';
        }
        let i = Math.floor( Math.log(size) / Math.log(1024) );
        let x = (size / Math.pow(1024, i)).toFixed(2);
        return (x + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i]);
    };
})

/**
 * Return the MIME type label.
 */
.filter('mimeTypeLabel', ['MimeService', function(mimeService: MimeService) {
    return (mimeType: string) => mimeService.getLabel(mimeType);
}])

/**
 * Return the MIME type icon URL.
 */
.filter('mimeTypeIcon', ['MimeService', function(mimeService: MimeService) {
    return (mimeType: string) => mimeService.getIconUrl(mimeType);
}])

/**
 * Convert ID-Array to (Display-)Name-String, separated by ','
 */
.filter('idsToNames', ['WebClientService', function (webClientService: WebClientService) {
    return(ids: string[]) => {
        let names: string[] = [];
        for (let id of ids) {
            this.contactReceiver = webClientService.contacts.get(id);
            names.push(this.contactReceiver.displayName);
        }
        return names.join(', ');
    };
}])

;
