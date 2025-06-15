export const defaultTheme = {
    allMessages: {
        lifetime: 60, // seconds
        maxCount: 30,
        textColor: '#ffffff',
        textOpacity: 0,
        blurRadius: 0,
        textShadowColor: '#000000',
        textShadowOpacity: 0.5,
        textShadowRadius: 5,
        textShadowXPosition: 0,
        textShadowYPosition: 0,
    },
    overlay: {
        paddingTop: 0,
        paddingLeft: 0,
        backgroundColor: null,
        backgroundOpacity: 0.0,
        backgroundImage: null,
        backgroundImageAspectRatio: 1,
        backgroundImageWidth: 1,
        backgroundImageHeight: 1,
        backgroundType: "none",
        containerWidth: 500,
        borderRadius: 0,
    },
    chatMessage: {
        backgroundColor: '#3e837c', // #311e64
        borderColor: '#00ffe3',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 5,
        direction: "row",
        borderRadius: 6,
        marginH: 10,
        marginV: 10,
        backgroundOpacity: 1.0,
    },
    followMessage: {
        backgroundColor: '#3e837c', // #311e64
        borderColor: '#00ffe3',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 5,
        direction: "row",
        borderRadius: 6,
        marginH: 10,
        marginV: 10,
        backgroundOpacity: 1.0,
    },
    redeemMessage: {
        backgroundColor: '#3e837c', // #311e64
        borderColor: '#00ffe3',
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 5,
        direction: "row",
        borderRadius: 6,
        marginH: 10,
        marginV: 10,
        backgroundOpacity: 1.0,
    },
    player: {
        backgroundColor: '#3e837c',
        backgroundOpacity: 1.0,

        borderColor: '#00ffe3',
        borderOpacity: 1.0,
        borderRadius: {
            topLeft: 0,
            topRight: 0,
            bottomLeft: 0,
            bottomRight: 0,
        },

        shadowColor: '#000',
        shadowOpacity: 0.5,

        diskShadowColor: '#000',
        diskShadowOpacity: 0.5,

        shadowRadius: 20,

        text: {
            textAlign: 'left',
            title: {
                fontSize: 16,
                color: '#fff',
                fontWeight: 'bold',
            },
            artist: {
                fontSize: 14,
                color: '#b8b8b8',
                fontWeight: 'normal',
            },
        },
    }


};