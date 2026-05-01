from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=True)
    
    weekly_reports = db.relationship('WeeklyReport', backref='author', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        team = Team.query.get(self.team_id) if self.team_id else None
        return {
            'id': self.id,
            'username': self.username,
            'name': self.name,
            'role': self.role,
            'team_id': self.team_id,
            'team_name': team.name if team else None
        }

class Team(db.Model):
    __tablename__ = 'teams'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    manager_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    def to_dict(self):
        manager = User.query.get(self.manager_id) if self.manager_id else None
        members = User.query.filter_by(team_id=self.id).all()
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'manager_id': self.manager_id,
            'manager_name': manager.name if manager else None,
            'member_count': len(members)
        }

class WeeklyReport(db.Model):
    __tablename__ = 'weekly_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    week_start = db.Column(db.Date, nullable=False)
    week_end = db.Column(db.Date, nullable=False)
    year = db.Column(db.Integer, nullable=False)
    week_number = db.Column(db.Integer, nullable=False)
    
    content = db.Column(db.Text, nullable=True)
    plans = db.Column(db.Text, nullable=True)
    problems = db.Column(db.Text, nullable=True)
    other = db.Column(db.Text, nullable=True)
    
    status = db.Column(db.String(20), default='draft')
    submit_time = db.Column(db.DateTime, nullable=True)
    return_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        user = User.query.get(self.user_id)
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': user.name if user else None,
            'week_start': self.week_start.isoformat() if self.week_start else None,
            'week_end': self.week_end.isoformat() if self.week_end else None,
            'year': self.year,
            'week_number': self.week_number,
            'content': self.content,
            'plans': self.plans,
            'problems': self.problems,
            'other': self.other,
            'status': self.status,
            'submit_time': self.submit_time.isoformat() if self.submit_time else None,
            'return_reason': self.return_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
