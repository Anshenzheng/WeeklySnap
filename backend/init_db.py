from app import app, db
from models import User, Team, WeeklyReport

def init_database():
    with app.app_context():
        db.create_all()
        print('数据库表创建完成')
        
        if not User.query.filter_by(username='admin').first():
            admin = User(
                username='admin',
                name='系统管理员',
                role='admin'
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
            print('已创建默认管理员账号: admin / admin123')
        
        print('数据库初始化完成！')

if __name__ == '__main__':
    init_database()
