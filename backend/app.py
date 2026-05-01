from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from config import Config
import openpyxl
from io import BytesIO
from flask import make_response
from extensions import db

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
jwt = JWTManager(app)
CORS(app)

from models import User, Team, WeeklyReport

def get_week_dates(year, week_num):
    d = date(year, 1, 1)
    if (d.weekday() > 3):
        d = d + timedelta(7 - d.weekday())
    else:
        d = d - timedelta(d.weekday())
    dlt = timedelta(days = (week_num - 1) * 7)
    week_start = d + dlt
    week_end = week_start + timedelta(days=6)
    return week_start, week_end

def get_week_number(d):
    return d.isocalendar()[1]

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'msg': '请输入用户名和密码'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not user.check_password(password):
        return jsonify({'msg': '用户名或密码错误'}), 401
    
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@app.route('/api/current_user', methods=['GET'])
@jwt_required()
def current_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({'msg': '用户不存在'}), 404
    return jsonify(user.to_dict()), 200

@app.route('/api/teams', methods=['GET'])
@jwt_required()
def get_teams():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role == 'admin':
        teams = Team.query.all()
    elif user.role == 'manager':
        teams = Team.query.filter_by(manager_id=user_id).all()
    else:
        teams = Team.query.filter_by(id=user.team_id).all()
    
    return jsonify([team.to_dict() for team in teams]), 200

@app.route('/api/teams', methods=['POST'])
@jwt_required()
def create_team():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role != 'admin':
        return jsonify({'msg': '无权限'}), 403
    
    data = request.get_json()
    name = data.get('name')
    description = data.get('description')
    manager_id = data.get('manager_id')
    
    if manager_id == '' or manager_id == 'null' or manager_id is None:
        manager_id = None
    elif manager_id and isinstance(manager_id, str):
        try:
            manager_id = int(manager_id)
        except ValueError:
            manager_id = None
    
    if not name:
        return jsonify({'msg': '团队名称不能为空'}), 400
    
    if Team.query.filter_by(name=name).first():
        return jsonify({'msg': '团队名称已存在'}), 400
    
    team = Team(name=name, description=description, manager_id=manager_id)
    db.session.add(team)
    db.session.commit()
    
    return jsonify(team.to_dict()), 201

@app.route('/api/teams/<int:team_id>', methods=['PUT'])
@jwt_required()
def update_team(team_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role != 'admin':
        return jsonify({'msg': '无权限'}), 403
    
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'msg': '团队不存在'}), 404
    
    data = request.get_json()
    if 'name' in data:
        team.name = data['name']
    if 'description' in data:
        team.description = data['description']
    if 'manager_id' in data:
        manager_id = data['manager_id']
        if manager_id == '' or manager_id == 'null' or manager_id is None:
            team.manager_id = None
        elif isinstance(manager_id, str):
            try:
                team.manager_id = int(manager_id)
            except ValueError:
                team.manager_id = None
        else:
            team.manager_id = manager_id
    
    db.session.commit()
    return jsonify(team.to_dict()), 200

@app.route('/api/teams/<int:team_id>', methods=['DELETE'])
@jwt_required()
def delete_team(team_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role != 'admin':
        return jsonify({'msg': '无权限'}), 403
    
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'msg': '团队不存在'}), 404
    
    members = User.query.filter_by(team_id=team_id).all()
    if members:
        return jsonify({'msg': '该团队还有成员，无法删除'}), 400
    
    db.session.delete(team)
    db.session.commit()
    return jsonify({'msg': '删除成功'}), 200

@app.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    query = User.query
    
    if user.role == 'admin':
        pass
    elif user.role == 'manager':
        managed_teams = Team.query.filter_by(manager_id=user_id).all()
        team_ids = [t.id for t in managed_teams]
        query = query.filter(User.team_id.in_(team_ids))
    else:
        query = query.filter_by(team_id=user.team_id)
    
    users = query.all()
    return jsonify([u.to_dict() for u in users]), 200

@app.route('/api/users', methods=['POST'])
@jwt_required()
def create_user():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role != 'admin':
        return jsonify({'msg': '无权限'}), 403
    
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    role = data.get('role')
    team_id = data.get('team_id')
    
    if team_id == '' or team_id == 'null' or team_id is None:
        team_id = None
    elif team_id and isinstance(team_id, str):
        try:
            team_id = int(team_id)
        except ValueError:
            team_id = None
    
    if not username or not password or not name or not role:
        return jsonify({'msg': '请填写完整信息'}), 400
    
    if role not in ['admin', 'manager', 'member']:
        return jsonify({'msg': '角色类型错误'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'msg': '用户名已存在'}), 400
    
    new_user = User(
        username=username,
        name=name,
        role=role,
        team_id=team_id
    )
    new_user.set_password(password)
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify(new_user.to_dict()), 201

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    user_id_current = int(get_jwt_identity())
    user = User.query.get(user_id_current)
    
    if user.role != 'admin':
        return jsonify({'msg': '无权限'}), 403
    
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'msg': '用户不存在'}), 404
    
    data = request.get_json()
    if 'username' in data:
        target_user.username = data['username']
    if 'name' in data:
        target_user.name = data['name']
    if 'password' in data and data['password']:
        target_user.set_password(data['password'])
    if 'role' in data:
        target_user.role = data['role']
    if 'team_id' in data:
        team_id = data['team_id']
        if team_id == '' or team_id == 'null' or team_id is None:
            target_user.team_id = None
        elif isinstance(team_id, str):
            try:
                target_user.team_id = int(team_id)
            except ValueError:
                target_user.team_id = None
        else:
            target_user.team_id = team_id
    
    db.session.commit()
    return jsonify(target_user.to_dict()), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    user_id_current = int(get_jwt_identity())
    user = User.query.get(user_id_current)
    
    if user.role != 'admin':
        return jsonify({'msg': '无权限'}), 403
    
    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({'msg': '用户不存在'}), 404
    
    reports = WeeklyReport.query.filter_by(user_id=user_id).all()
    if reports:
        return jsonify({'msg': '该用户还有周报数据，无法删除'}), 400
    
    db.session.delete(target_user)
    db.session.commit()
    return jsonify({'msg': '删除成功'}), 200

@app.route('/api/weekly_reports', methods=['GET'])
@jwt_required()
def get_weekly_reports():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    year = request.args.get('year', type=int)
    week_number = request.args.get('week_number', type=int)
    member_id = request.args.get('member_id', type=int)
    status = request.args.get('status')
    
    query = WeeklyReport.query
    
    if user.role == 'member':
        query = query.filter_by(user_id=user_id)
    elif user.role == 'manager':
        managed_teams = Team.query.filter_by(manager_id=user_id).all()
        team_ids = [t.id for t in managed_teams]
        team_members = User.query.filter(User.team_id.in_(team_ids)).all()
        user_ids = [m.id for m in team_members]
        query = query.filter(WeeklyReport.user_id.in_(user_ids))
    
    if year:
        query = query.filter_by(year=year)
    if week_number:
        query = query.filter_by(week_number=week_number)
    if member_id:
        query = query.filter_by(user_id=member_id)
    if status:
        query = query.filter_by(status=status)
    
    pagination = query.order_by(
        WeeklyReport.year.desc(),
        WeeklyReport.week_number.desc(),
        WeeklyReport.submit_time.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'items': [report.to_dict() for report in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'page': pagination.page,
        'per_page': pagination.per_page
    }), 200

@app.route('/api/weekly_reports/current_week', methods=['GET'])
@jwt_required()
def get_current_week_report():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    today = date.today()
    year = today.isocalendar()[0]
    week_number = today.isocalendar()[1]
    week_start, week_end = get_week_dates(year, week_number)
    
    report = WeeklyReport.query.filter_by(
        user_id=user_id,
        year=year,
        week_number=week_number
    ).first()
    
    if report:
        return jsonify(report.to_dict()), 200
    
    return jsonify({
        'week_start': week_start.isoformat(),
        'week_end': week_end.isoformat(),
        'year': year,
        'week_number': week_number,
        'status': 'not_started'
    }), 200

@app.route('/api/weekly_reports', methods=['POST'])
@jwt_required()
def create_weekly_report():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    data = request.get_json()
    year = data.get('year')
    week_number = data.get('week_number')
    content = data.get('content', '')
    plans = data.get('plans', '')
    problems = data.get('problems', '')
    other = data.get('other', '')
    submit_now = data.get('submit_now', False)
    
    if not year or not week_number:
        return jsonify({'msg': '缺少周信息'}), 400
    
    week_start, week_end = get_week_dates(year, week_number)
    
    existing = WeeklyReport.query.filter_by(
        user_id=user_id,
        year=year,
        week_number=week_number
    ).first()
    
    if existing:
        return jsonify({'msg': '该周周报已存在'}), 400
    
    report = WeeklyReport(
        user_id=user_id,
        week_start=week_start,
        week_end=week_end,
        year=year,
        week_number=week_number,
        content=content,
        plans=plans,
        problems=problems,
        other=other,
        status='draft'
    )
    
    if submit_now:
        report.status = 'submitted'
        report.submit_time = datetime.utcnow()
    
    db.session.add(report)
    db.session.commit()
    
    return jsonify(report.to_dict()), 201

@app.route('/api/weekly_reports/<int:report_id>', methods=['PUT'])
@jwt_required()
def update_weekly_report(report_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    report = WeeklyReport.query.get(report_id)
    if not report:
        return jsonify({'msg': '周报不存在'}), 404
    
    if user.role == 'member' and report.user_id != user_id:
        return jsonify({'msg': '无权限'}), 403
    
    if report.status == 'submitted' and user.role == 'member':
        return jsonify({'msg': '已提交的周报不能修改'}), 400
    
    data = request.get_json()
    submit_now = data.get('submit_now', False)
    
    if 'content' in data:
        report.content = data['content']
    if 'plans' in data:
        report.plans = data['plans']
    if 'problems' in data:
        report.problems = data['problems']
    if 'other' in data:
        report.other = data['other']
    
    if submit_now and report.status in ['draft', 'returned']:
        report.status = 'submitted'
        report.submit_time = datetime.utcnow()
        report.return_reason = None
    
    db.session.commit()
    return jsonify(report.to_dict()), 200

@app.route('/api/weekly_reports/<int:report_id>/return', methods=['POST'])
@jwt_required()
def return_report(report_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    if user.role not in ['admin', 'manager']:
        return jsonify({'msg': '无权限'}), 403
    
    report = WeeklyReport.query.get(report_id)
    if not report:
        return jsonify({'msg': '周报不存在'}), 404
    
    if report.status != 'submitted':
        return jsonify({'msg': '只能退回已提交的周报'}), 400
    
    data = request.get_json()
    return_reason = data.get('return_reason', '')
    
    report.status = 'returned'
    report.return_reason = return_reason
    
    db.session.commit()
    return jsonify(report.to_dict()), 200

@app.route('/api/unsubmitted', methods=['GET'])
@jwt_required()
def get_unsubmitted():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    year = request.args.get('year', type=int)
    week_number = request.args.get('week_number', type=int)
    
    if not year or not week_number:
        today = date.today()
        year = today.isocalendar()[0]
        week_number = today.isocalendar()[1]
    
    if user.role == 'admin':
        members = User.query.filter_by(role='member').all()
    elif user.role == 'manager':
        managed_teams = Team.query.filter_by(manager_id=user_id).all()
        team_ids = [t.id for t in managed_teams]
        members = User.query.filter(User.role == 'member', User.team_id.in_(team_ids)).all()
    else:
        return jsonify({'msg': '无权限'}), 403
    
    submitted_reports = WeeklyReport.query.filter_by(
        year=year,
        week_number=week_number,
        status='submitted'
    ).all()
    submitted_user_ids = [r.user_id for r in submitted_reports]
    
    unsubmitted_members = [m for m in members if m.id not in submitted_user_ids]
    
    return jsonify({
        'year': year,
        'week_number': week_number,
        'total_members': len(members),
        'submitted_count': len(submitted_user_ids),
        'unsubmitted_count': len(unsubmitted_members),
        'unsubmitted_members': [m.to_dict() for m in unsubmitted_members]
    }), 200

@app.route('/api/weekly_reports/export', methods=['GET'])
@jwt_required()
def export_weekly_reports():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    year = request.args.get('year', type=int)
    week_number = request.args.get('week_number', type=int)
    member_id = request.args.get('member_id', type=int)
    status = request.args.get('status')
    
    query = WeeklyReport.query
    
    if user.role == 'member':
        query = query.filter_by(user_id=user_id)
    elif user.role == 'manager':
        managed_teams = Team.query.filter_by(manager_id=user_id).all()
        team_ids = [t.id for t in managed_teams]
        team_members = User.query.filter(User.team_id.in_(team_ids)).all()
        user_ids = [m.id for m in team_members]
        query = query.filter(WeeklyReport.user_id.in_(user_ids))
    
    if year:
        query = query.filter_by(year=year)
    if week_number:
        query = query.filter_by(week_number=week_number)
    if member_id:
        query = query.filter_by(user_id=member_id)
    if status:
        query = query.filter_by(status=status)
    
    reports = query.order_by(
        WeeklyReport.year.desc(),
        WeeklyReport.week_number.desc()
    ).all()
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = '周报汇总'
    
    headers = ['成员', '团队', '年份', '周数', '状态', '提交时间', '本周工作', '下周计划', '遇到问题', '其他']
    ws.append(headers)
    
    for report in reports:
        member = User.query.get(report.user_id)
        team = Team.query.get(member.team_id) if member and member.team_id else None
        status_map = {'draft': '草稿', 'submitted': '已提交', 'returned': '已退回'}
        row = [
            member.name if member else '',
            team.name if team else '',
            report.year,
            report.week_number,
            status_map.get(report.status, report.status),
            report.submit_time.strftime('%Y-%m-%d %H:%M') if report.submit_time else '',
            report.content or '',
            report.plans or '',
            report.problems or '',
            report.other or ''
        ]
        ws.append(row)
    
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column].width = adjusted_width
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    response.headers['Content-Disposition'] = 'attachment; filename=weekly_reports.xlsx'
    
    return response

@app.route('/api/statistics/submissions', methods=['GET'])
@jwt_required()
def get_submission_statistics():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    start_year = request.args.get('start_year', type=int)
    start_week = request.args.get('start_week', type=int)
    end_year = request.args.get('end_year', type=int)
    end_week = request.args.get('end_week', type=int)
    
    if user.role == 'admin':
        members = User.query.filter_by(role='member').all()
    elif user.role == 'manager':
        managed_teams = Team.query.filter_by(manager_id=user_id).all()
        team_ids = [t.id for t in managed_teams]
        members = User.query.filter(User.role == 'member', User.team_id.in_(team_ids)).all()
    else:
        return jsonify({'msg': '无权限'}), 403
    
    member_stats = []
    for member in members:
        query = WeeklyReport.query.filter_by(user_id=member.id, status='submitted')
        if start_year and start_week:
            if end_year and end_week:
                pass
        total_submitted = query.count()
        
        team = Team.query.get(member.team_id) if member.team_id else None
        member_stats.append({
            'user_id': member.id,
            'user_name': member.name,
            'team_name': team.name if team else '',
            'total_submitted': total_submitted
        })
    
    return jsonify(member_stats), 200

@app.route('/api/statistics/weekly_rates', methods=['GET'])
@jwt_required()
def get_weekly_rates():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    
    year = request.args.get('year', type=int)
    if not year:
        year = date.today().isocalendar()[0]
    
    if user.role == 'admin':
        members = User.query.filter_by(role='member').all()
    elif user.role == 'manager':
        managed_teams = Team.query.filter_by(manager_id=user_id).all()
        team_ids = [t.id for t in managed_teams]
        members = User.query.filter(User.role == 'member', User.team_id.in_(team_ids)).all()
    else:
        return jsonify({'msg': '无权限'}), 403
    
    total_members = len(members)
    if total_members == 0:
        return jsonify([]), 200
    
    weekly_reports = WeeklyReport.query.filter_by(year=year, status='submitted').all()
    
    week_stats = {}
    for report in weekly_reports:
        week_num = report.week_number
        if week_num not in week_stats:
            week_stats[week_num] = set()
        week_stats[week_num].add(report.user_id)
    
    result = []
    for week_num in sorted(week_stats.keys()):
        submitted_count = len(week_stats[week_num])
        rate = round((submitted_count / total_members) * 100, 2)
        result.append({
            'year': year,
            'week_number': week_num,
            'total_members': total_members,
            'submitted_count': submitted_count,
            'submission_rate': rate
        })
    
    return jsonify(result), 200

def init_db():
    with app.app_context():
        db.create_all()
        
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
