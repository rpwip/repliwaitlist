import { UserService } from '../../services/user-service';
import { DatabaseService } from '../../services/database-service';

describe('UserService Integration', () => {
  let userService: UserService;
  let dbService: DatabaseService;

  beforeAll(async () => {
    dbService = new DatabaseService();
    await dbService.connect();
    userService = new UserService(dbService);
  });

  afterAll(async () => {
    await dbService.disconnect();
  });

  test('creates and retrieves user', async () => {
    const user = await userService.createUser({
      name: 'Test User',
      email: 'test@example.com'
    });
    
    const retrieved = await userService.getUserById(user.id);
    expect(retrieved).toEqual(user);
  });
}); 