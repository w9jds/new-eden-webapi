export default class FirebaseUtils {
    private static PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

    public static generateKey = () => {
        let lastPushTime = 0;
        let lastRandChars = [];
        let now = new Date().getTime();
        let duplicateTime = (now === lastPushTime);
        
        lastPushTime = now;
    
        var timeStampChars = new Array(8);
        for (var i = 7; i >= 0; i--) {
            timeStampChars[i] = FirebaseUtils.PUSH_CHARS.charAt(now % 64);
            now = Math.floor(now / 64);
        }
        if (now !== 0) throw new Error('We should have converted the entire timestamp.');
    
        var id = timeStampChars.join('');
    
        if (!duplicateTime) {
            for (i = 0; i < 12; i++) {
                lastRandChars[i] = Math.floor(Math.random() * 64);
            }
        } else {
            for (i = 11; i >= 0 && lastRandChars[i] === 63; i--) {
                lastRandChars[i] = 0;
            }
            lastRandChars[i]++;
        }
        for (i = 0; i < 12; i++) {
            id += FirebaseUtils.PUSH_CHARS.charAt(lastRandChars[i]);
        }
        if (id.length != 20) throw new Error('Length should be 20.');
    
        return id;
    };
}

