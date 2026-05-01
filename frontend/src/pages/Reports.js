import React, { useState, useEffect } from 'react';
import { Table, Button, Select, Input, Tag, Modal, Form, message, Card, Space, Popconfirm } from 'antd';
import { EyeOutlined, RollbackOutlined, ExportOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({});
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [returnForm] = Form.useForm();

  const fetchReports = async (page = 1, pageSize = 10, currentFilters = {}) => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: pageSize,
        ...currentFilters,
      };
      const response = await api.get('/weekly_reports', { params });
      const data = response.data;
      setReports(data.items);
      setPagination({
        current: data.page,
        pageSize: data.per_page,
        total: data.total,
      });
    } catch (error) {
      message.error('获取周报列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      message.error('获取用户列表失败');
    }
  };

  useEffect(() => {
    fetchReports();
    fetchUsers();
  }, []);

  const handleTableChange = (pagination) => {
    fetchReports(pagination.current, pagination.pageSize, filters);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value || undefined };
    if (value === undefined || value === null || value === '') {
      delete newFilters[key];
    }
    setFilters(newFilters);
    fetchReports(1, pagination.pageSize, newFilters);
  };

  const handleView = (record) => {
    setSelectedReport(record);
    setViewModalVisible(true);
  };

  const handleReturn = (record) => {
    setSelectedReport(record);
    returnForm.resetFields();
    setReturnModalVisible(true);
  };

  const handleReturnSubmit = async (values) => {
    try {
      await api.post(`/weekly_reports/${selectedReport.id}/return`, {
        return_reason: values.return_reason,
      });
      message.success('退回成功');
      setReturnModalVisible(false);
      fetchReports(pagination.current, pagination.pageSize, filters);
    } catch (error) {
      message.error(error.response?.data?.msg || '退回失败');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });
      
      const response = await api.get('/weekly_reports/export', {
        params,
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `周报汇总_${dayjs().format('YYYYMMDD')}.xlsx`;
      link.click();
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const getStatusTag = (status) => {
    switch (status) {
      case 'draft':
        return <Tag className="status-tag-draft">草稿</Tag>;
      case 'submitted':
        return <Tag className="status-tag-submitted">已提交</Tag>;
      case 'returned':
        return <Tag className="status-tag-returned">已退回</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    {
      title: '成员',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: '周数',
      dataIndex: 'week_number',
      key: 'week_number',
      render: (week) => `第 ${week} 周`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: '提交时间',
      dataIndex: 'submit_time',
      key: 'submit_time',
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleView(record)}>
            查看
          </Button>
          {record.status === 'submitted' && (
            <Button type="link" danger icon={<RollbackOutlined />} onClick={() => handleReturn(record)}>
              退回
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const weeks = Array.from({ length: 53 }, (_, i) => i + 1);

  return (
    <div>
      <h3 className="page-title">周报列表</h3>
      
      <div className="filter-bar">
        <Select
          placeholder="选择年份"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => handleFilterChange('year', value)}
        >
          {years.map(year => (
            <Select.Option key={year} value={year}>{year}年</Select.Option>
          ))}
        </Select>
        
        <Select
          placeholder="选择周数"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => handleFilterChange('week_number', value)}
        >
          {weeks.map(week => (
            <Select.Option key={week} value={week}>第{week}周</Select.Option>
          ))}
        </Select>
        
        <Select
          placeholder="选择成员"
          style={{ width: 150 }}
          allowClear
          onChange={(value) => handleFilterChange('member_id', value)}
        >
          {users.map(user => (
            <Select.Option key={user.id} value={user.id}>{user.name}</Select.Option>
          ))}
        </Select>
        
        <Select
          placeholder="选择状态"
          style={{ width: 120 }}
          allowClear
          onChange={(value) => handleFilterChange('status', value)}
        >
          <Select.Option value="draft">草稿</Select.Option>
          <Select.Option value="submitted">已提交</Select.Option>
          <Select.Option value="returned">已退回</Select.Option>
        </Select>
        
        <Button type="primary" icon={<ExportOutlined />} onClick={handleExport}>
          导出Excel
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={reports}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
      />

      <Modal
        title="查看周报详情"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedReport && (
          <div>
            <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
              <p><strong>成员：</strong>{selectedReport.user_name}</p>
              <p><strong>周期：</strong>{selectedReport.year}年 第{selectedReport.week_number}周</p>
              <p><strong>状态：</strong>{getStatusTag(selectedReport.status)}</p>
              <p><strong>提交时间：</strong>{selectedReport.submit_time ? dayjs(selectedReport.submit_time).format('YYYY-MM-DD HH:mm') : '-'}</p>
              {selectedReport.return_reason && (
                <p><strong>退回原因：</strong>{selectedReport.return_reason}</p>
              )}
            </Card>
            
            {selectedReport.content && (
              <div className="report-section">
                <h4>本周工作内容</h4>
                <p>{selectedReport.content}</p>
              </div>
            )}
            
            {selectedReport.plans && (
              <div className="report-section">
                <h4>下周工作计划</h4>
                <p>{selectedReport.plans}</p>
              </div>
            )}
            
            {selectedReport.problems && (
              <div className="report-section">
                <h4>遇到的问题与建议</h4>
                <p>{selectedReport.problems}</p>
              </div>
            )}
            
            {selectedReport.other && (
              <div className="report-section">
                <h4>其他</h4>
                <p>{selectedReport.other}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="退回周报"
        open={returnModalVisible}
        onCancel={() => setReturnModalVisible(false)}
        onOk={() => returnForm.submit()}
      >
        <Form form={returnForm} layout="vertical" onFinish={handleReturnSubmit}>
          <Form.Item
            name="return_reason"
            label="退回原因"
            rules={[{ required: true, message: '请输入退回原因' }]}
          >
            <TextArea rows={4} placeholder="请输入退回原因..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Reports;
