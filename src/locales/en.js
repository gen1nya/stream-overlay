const en = {
    translation: {
        auth: {
            title: 'Ready to get started?',
            idle: {
                message: 'Please sign in to continue',
                button: 'Sign in with Twitch',
            },
            loading: 'Initializing...',
            prompt: 'Complete the authorization in Twitch',
            methodTitle: 'Authorization method',
            methodCode: 'Code and link',
            methodQr: 'QR code',
            openBrowser: 'Open in browser',
            enterCode: 'Enter the code',
            qrHint: 'Scan the QR code with your mobile device. The camera will open the authorization page with the code prefilled.',
            waiting: 'Waiting for authorization (attempt {{count}})',
            cancel: 'Cancel',
            successTitle: '✅ Authorization successful!',
            successSubtitle: 'Redirecting to the dashboard...',
            errorTitle: 'Authorization error',
            retry: 'Try again',
            startError: 'Failed to start authorization',
            language: 'Interface language',
        },
        footer: {
            settings: 'Settings',
            player2: 'Player #2 (record)',
            player1: 'Player #1',
            demoColumns: 'FFT demo (columns)',
            demoRing: 'FFT demo (ring)',
        },
        loading: {
            title: 'Loading...'
        },
        notFound: {
            title: 'Buddy, wrong door!',
            hint: 'Leather club is two blocks down'
        },
        common: {
            theme: 'Theme',
            bot: 'Bot',
            settings: 'Settings',
            logout: 'Log out',
            back: 'Back',
            preview: 'Preview',
            copyLink: 'Copy link',
            open: 'Open',
            close: 'Close',
            loading: 'Loading...',
        },
        dashboard: {
            windowTitle: 'Overlay HQ - {{name}}',
            headerMessages: [
                { type: 'text', text: 'So, ready?' },
                { type: 'text', text: '"Bots + in chat"' },
                { type: 'text', text: 'Who goes there?!' },
                { type: 'text', text: 'Urgent! Fix your monitor!' },
                { type: 'text', text: '[PEKO]' },
                { type: 'text', text: 'Hi... how can I help?' },
                { type: 'text', text: 'Milky UwU-n' },
                { type: 'text', text: 'Emotional Damage!' },
                { type: 'text', text: 'Forgot to configure again?' },
                { type: 'text', text: 'Fyr-fyr-fyr' },
                { type: 'text', text: '!roulette' },
                { type: 'text', text: 'Spin the wheel' },
                { type: 'text', text: 'I am Oleg, 42 years old' },
                { type: 'text', text: 'We poke things with sticks' },
                { type: 'text', text: "When's the DRG?" },
                { type: 'text', text: 'Good luck, have fun!' },
                { type: 'text', text: 'Good hunting, stalker!' },
                { type: 'text', text: 'Have a great stream ;)' },
                { type: 'text', text: 'Hee-hee, haha' },
                { type: 'text', text: '…ᘛ⁐̤ᕐᐷ…ᘛ⁐̤ᕐᐷ…ᘛ⁐̤ᕐᐷ' },
                { type: 'text', text: 'Are you a fisherman?' },
                { type: 'text', text: 'undefined' },
                { type: 'text', text: 'Yevgotaro Pekorsky' },
                { type: 'text', text: 'Go to horny jail' },
                { type: 'text', text: 'Kuwuwun' },
                { type: 'text', text: '[DATA EXPUNGED]' },
                { type: 'text', text: '[Your copypasta could be here]' },
                { type: 'text', text: 'Foxonade' },
                { type: 'text', text: 'Silly-cat sodium' },
                { type: 'text', text: 'Pour pu-erh into my mug!' },
                { type: 'text', text: '<Removed by moderator>' },
                { type: 'text', text: 'Kitty-kitty meow-meow' },
                { type: 'text', text: 'Pour pu-erh into my mug!' },
                { type: 'text', text: 'FoxDuke Nukem' },
                { type: 'text', text: 'TheIlluminati' },
                { type: 'text', text: 'Rrrrrfish!' },
                { type: 'text', text: 'Wake up samurai—the stream crashed' },
                { type: 'inlineLink', text: 'Also check out', linkText: 'streamiverse.io', href: 'https://streamiverse.io' },
                { type: 'link', text: 'Ebatel.online', href: 'https://tools.rus.ebatel.online/' },
                { type: 'text', text: 'Hey there, sunshines!' },
                { type: 'text', text: 'Seiso or horny today?' },
                { type: 'action', text: 'NEPTUNE INTELLIGENZA', action: 'openTerminal' },
            ],
            betaTesters: [
                'ellis_leaf',
                'kururun_chan',
                'fox1k_ru',
                'sonamint',
                'kigudi',
                'kurosakissora',
                'qvik_l',
                'gena_zogii'
            ],
            cards: {
                account: {
                    title: 'Account',
                    status: {
                        online: 'Stream is live',
                        offline: 'Stream is offline',
                    },
                    followers: 'Followers: {{count}}',
                    loading: 'Loading account info...'
                },
                chat: {
                    title: 'Chat overlay',
                    open: 'Open chat',
                    copyLink: 'Copy link',
                    themeLabel: 'Theme',
                    defaultThemeOption: 'Default'
                },
                widgets: {
                    title: 'Widgets',
                    playerCard: 'Card player',
                    playerVinyl: 'Vinyl player',
                    followersGoal: 'Followers goal / stream'
                }
            },
            logs: {
                title: 'Logs'
            },
            status: {
                uptime: 'Uptime: {{duration}}',
                eventSub: 'EventSub: {{duration}}',
                irc: 'IRC: {{duration}}',
                reconnect: 'Reconnect'
            },
            footer: {
                betaTest: 'Beta test:'
            }
        },
        userInfo: {
            title: 'User info',
            loading: 'Loading...',
            badges: {
                moderator: 'Moderator',
                vip: 'VIP',
                muted: 'Muted',
            },
            meta: {
                id: 'ID',
                created: 'Created',
                following: 'Following since',
                mutedUntil: 'Muted until',
            },
            actions: {
                unban: 'Unban',
                mute1m: 'Mute 1m',
                mute10m: 'Mute 10m',
                removeVip: 'Remove VIP',
                makeVip: 'Make VIP',
                removeMod: 'Remove Mod',
                makeMod: 'Make Mod',
            },
            error: 'Could not load user info.'
        },
        settings: {
            header: {
                title: 'Settings',
            },
            colorPicker: {
                title: 'Color',
            },
            pages: {
                general: { title: 'General settings', label: 'General' },
                chat: { title: 'Chat message settings', label: 'Messages' },
                follow: { title: 'Follower settings', label: 'Follow' },
                channelPoints: { title: 'Channel points settings', label: 'Points' },
                bot: { title: 'Bot settings', label: 'Bot >_' },
                players: { title: 'Player settings', label: 'Players' },
                youtube: { title: 'YouTube chat', label: 'YouTube Chat' },
                followersGoal: { title: 'Follower progress', label: 'Progress' },
                about: { title: 'About', label: 'About' },
            },
            general: {
                appearance: {
                    title: 'Appearance',
                    subtitle: 'Personalize the interface to your liking',
                    languageLabel: 'Interface language',
                    loading: 'Loading languages…',
                    saving: 'Applying language…',
                    error: 'Could not update the language. Please try again.',
                },
            },
            follow: {
                title: 'Follow variant #{{index}}',
                collapse: 'Collapse',
                expand: 'Expand',
                template: {
                    title: 'Message template',
                    hint: 'Available placeholders: {userName}',
                    label: 'Template for new followers',
                    textColor: 'Text color',
                    shadowColor: 'Text shadow color',
                    shadowRadius: 'Shadow radius',
                },
                background: {
                    title: 'Background settings',
                    type: 'Background type',
                    radius: 'Corner radius',
                    options: {
                        color: 'Color',
                        image: 'Image',
                        gradient: 'Gradient',
                    },
                },
                layout: {
                    title: 'Spacing and positioning',
                },
                delete: {
                    action: 'Delete variant',
                    tooltip: 'Delete variant',
                    disabledTooltip: 'Cannot delete the last item',
                },
            },
            fft: {
                title: 'FFT analyzer',
                collapse: 'Collapse',
                expand: 'Configure',
                status: {
                    error: 'Error',
                    active: 'Active',
                    noDevice: 'No device',
                    disabled: 'Disabled',
                },
                device: {
                    notSelected: 'Not selected',
                    placeholder: 'Choose a device',
                    refresh: 'Refresh device list',
                    selected: 'Selected: {{name}}',
                },
                sections: {
                    general: 'General settings',
                    device: 'Audio device',
                    parameters: 'Analyzer parameters',
                    demo: 'FFT demo',
                },
                controls: {
                    enable: 'Enable FFT analyzer',
                    enabled: 'Enabled',
                    disabled: 'Disabled',
                },
                preview: {
                    description: 'Real-time audio analyzer for creating visual effects.<br/><br/><highlight>Device:</highlight> {{device}}',
                },
                sliders: {
                    dbFloor: 'Lower threshold (dB)',
                    masterGain: 'Master gain',
                    tilt: 'Frequency tilt',
                },
                demo: {
                    columns: 'FFT demo (bars)',
                    ring: 'FFT demo (ring)',
                    waveform: 'Wave demo',
                    hint: 'Opens in a new window for visualization testing.',
                },
                errors: {
                    loadConfig: 'Failed to load FFT configuration',
                    loadDevices: 'Failed to load audio devices',
                    toggle: 'Failed to toggle FFT',
                    setDevice: 'Failed to set audio device',
                    setGain: 'Failed to update FFT gain',
                    setDbFloor: 'Failed to update FFT lower threshold',
                    setTilt: 'Failed to update FFT tilt',
                },
            },
            about: {
                appName: 'Overlay HQ',
                version: 'Version {{version}}',
                build: 'Built on {{date}}',
                description: {
                    title: 'About the project',
                    paragraph1: {
                        line1: 'A set of widgets for overlays in OBS Studio and other software (chat, players, follower goal).',
                        line2: 'Includes a bot with gacha, roulette, and simple call-and-response.',
                    },
                    paragraph2: {
                        line1: 'The project is fully open source, free, collects no analytics, and needs no server.',
                        line2: 'I appreciate any help—from testing and bug reports to code and design.',
                    },
                    support: 'Crafted with support from <highlight>NEPTUNE INTELLIGENZA</highlight>',
                    license: {
                        label: 'License',
                        value: 'GNU GPL v3 License',
                    },
                    platform: {
                        label: 'Platforms',
                        value: 'Windows, Linux (if you are brave enough)',
                    },
                },
                social: {
                    title: 'Contacts & social',
                    github: 'GitHub',
                    twitch: 'Twitch',
                    website: 'Website',
                },
            },
            botConfigMissing: {
                title: 'Bot configuration not found',
                line1: 'Load or create a configuration to set up the bot.',
                line2: 'Something broke. Ping me directly.',
            },
            unknownPage: 'Unknown page',
        },
        twitchUsers: {
            title: 'Twitch users',
            search: {
                placeholder: 'Search users...',
                clear: 'Clear search (ESC)',
            },
            filtersLabel: 'Filters:',
            filters: {
                vips: 'VIP',
                followers: 'Followers',
                moderators: 'Moderators',
                editors: 'Editors',
            },
            table: {
                name: 'Name',
                status: 'Status',
                lastSeen: 'Last seen',
                followedSince: 'Follower since',
            },
            states: {
                loading: 'Loading...',
                emptyTitle: 'No users found',
                emptyDescription: 'Try adjusting your search query or filters',
            },
            statusIcons: {
                vipAdd: 'Add VIP (click to toggle)',
                vipRemove: 'Remove VIP (click to toggle)',
                follower: 'Follower',
                modAdd: 'Promote to moderator (click to toggle)',
                modRemove: 'Remove moderator (click to toggle)',
                editor: 'Editor',
            },
            pagination: {
                info: 'Showing {{current}} of {{total}} users',
                page: 'Page {{page}}',
            },
            lastSeen: {
                never: 'Never',
                justNow: 'Just now',
                minutes_one: '{{count}} minute ago',
                minutes_other: '{{count}} minutes ago',
                hours_one: '{{count}} hour ago',
                hours_other: '{{count}} hours ago',
                days_one: '{{count}} day ago',
                days_other: '{{count}} days ago',
            }
        },
    },
};

export default en;
