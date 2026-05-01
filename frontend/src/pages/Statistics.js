import React, { useState, useEffect } from 'react';
import { Card, Select, Table, Tabs, message, Row, Col } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../services/api';

const { TabPane } = Tabs;

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

const Statistics = () => {
  const [submissionStats, setSubmissionStats] = useState([]);
  const [weeklyRates, setWeeklyRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchSubmissionStats = async () => {
    try {
      const response = await api.get('/statistics/submissions');
      setSubmissionStats(response.data);
    } catch (error) {
      message.error('获取成员统计数据失败');
    }
  };

  const fetchWeeklyRates = async () => {
    try {
      const response = await api.get('/statistics/weekly_rates', {
        params: { year },
      });
      setWeeklyRates(response.data);
    } catch (error) {
      message.error('获取周统计数据失败');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSubmissionStats(), fetchWeeklyRates()]).finally(() => {
      setLoading(false);
    });
  }, [year]);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const memberColumns = [
    {
      title: '成员姓名',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '所属团队',
      dataIndex: 'team_name',
      key: 'team_name',
      render: (text) => text || '-',
    },
    {
      title: '提交次数',
      dataIndex: 'total_submitted',
      key: 'total_submitted',
      sorter: (a, b) => a.total_submitted - b.total_submitted,
    },
  ];

  const weeklyColumns = [
    {
      title: '周数',
      dataIndex: 'week_number',
      key: 'week_number',
      render: (week) => `第 ${week} 周`,
    },
    {
      title: '总人数',
      dataIndex: 'total_members',
      key: 'total_members',
    },
    {
      title: '已提交',
      dataIndex: 'submitted_count',
      key: 'submitted_count',
    },
    {
      title: '提交率',
      dataIndex: 'submission_rate',
      key: 'submission_rate',
      render: (rate) => `${rate}%`,
    },
  ];

  const pieData = submissionStats.slice(0, 10).map((item, index) => ({
    name: item.user_name,
    value: item.total_submitted,
  }));

  const barData = weeklyRates.map((item) => ({
    name: `第${item.week_number}周`,
    提交率: item.submission_rate,
  }));

  return (
    <div>
      <h3 className="page-title">数据统计</h3>
      
      <div className="filter-bar" style={{ justifyContent: 'flex-end' }}>
        <span style={{ lineHeight: '32px', marginRight: 8 }}>年份：</span>
        <Select
          value={year}
          style={{ width: 120 }}
          onChange={setYear}
        >
          {years.map(y => (
            <Select.Option key={y} value={y}>{y}年</Select.Option>
          ))}
        </Select>
      </div>

      <Tabs defaultActiveKey="1">
        <TabPane tab="成员提交统计" key="1">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="各成员提交次数（表格）" loading={loading}>
                <Table
                  columns={memberColumns}
                  dataSource={submissionStats}
                  rowKey="user_id"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="提交次数分布（饼图）" loading={loading}>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane tab="每周提交率" key="2">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="各周提交率（表格）" loading={loading}>
                <Table
                  columns={weeklyColumns}
                  dataSource={weeklyRates}
                  rowKey="week_number"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="各周提交率趋势（柱状图）" loading={loading}>
                <div style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, '提交率']} />
                      <Legend />
                      <Bar dataKey="提交率" fill="#1890ff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Statistics;
