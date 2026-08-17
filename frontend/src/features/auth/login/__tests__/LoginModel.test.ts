import { initialLoginForm } from '../LoginModel';

describe('LoginModel', () => {
    it('should have correct initial values', () => {
        expect(initialLoginForm).toEqual({
            email: "",
            password: "",
        });
    });
});
