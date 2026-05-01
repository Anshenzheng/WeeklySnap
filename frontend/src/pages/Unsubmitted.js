import React, { useState, useEffect } from 'react';
import { Card, Select, Button, Table, Tag, message, Space, Statistic, Row, Col } from 'antd';
import { BellOutlined, UserOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const Unsubmitted = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [weekNumber, setWeekNumber] = useState(
    Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000)
  );

  const fetchUnsubmitted = async () => {
    setLoading(true);
    try {
      const response = await api.get('/unsubmitted', {
        params: {
          year,
          week_number: weekNumber,
        },
      });
      setData(response.data);
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnsubmitted();
  }, [year, weekNumber]);

  const handleRemind = (user) => {
    message.success(`已向 ${user.name} 发送催报通知`);
  };

  const handleRemindAll = () => {
    if (data?.unsubmitted_members?.length > 0) {
      message.success(`已向 ${data.unsubmitted_members.length} 位未提交成员发送催报通知`);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

  const columns = [
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <UserOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '团队',
      dataIndex: 'team_name',
      key: 'team_name',
      render: (text) => text || '-',
    },
    {
      title: '状态',
      key: 'status',
      render: () => <Tag color="orange">未提交</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button
          type="link"
          icon={<BellOutlined />}
          onClick={() => handleRemind(record)}
        >
          催报
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h3 className="page-title">未提交统计</h3>
      
      <div className="filter-bar">
        <Select
          value={year}
          style={{ width: 120 }}
          onChange={setYear}
        >
          {years.map(y => (
            <Select.Option key={y} value={y}>{y}年</Select.Option>
          ))}
        </Select>
        
        <Select
          value={weekNumber}
          style={{ width: 120 }}
          onChange={setWeekNumber}
        >
          {weeks.map(w => (
            <Select.Option key={w} value={w}>第{w}周</Select.Option>
          ))}
        </Select>
        
        {data?.unsubmitted_members?.length > 0 && (
          <Button
            type="primary"
            danger
            icon={<BellOutlined />}
            onClick={handleRemindAll}
          >
            一键催报 ({data.unsubmitted_members.length})
          </Button>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card className="statistics-card">
            <Statistic
              title="团队成员总数"
              value={data?.total_members || 0}
              valueStyle={{ color: '#1890ff' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="statistics-card">
            <Statistic
              title="已提交人数"
              value={data?.submitted_count || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="statistics-card">
            <Statistic
              title="未提交人数"
              value={data?.unsubmitted_count || 0}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {data?.unsubmitted_count > 0 ? (
        <Card title="未提交成员列表">
          <Table
            columns={columns}
            dataSource={data.unsubmitted_members}
            rowKey="id"
            loading={loading}
            pagination={false}
          />
        </Card>
      ) : (
        <Card>
          <div className="empty-state">
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
            <p>本周所有成员都已提交周报，表现不错！</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Unsubmitted;
