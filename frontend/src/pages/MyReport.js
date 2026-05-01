import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Tag, message, Space, Alert } from 'antd';
import { SaveOutlined, SendOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { TextArea } = Input;

const MyReport = () => {
  const [form] = Form.useForm();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCurrentWeekReport = async () => {
    setLoading(true);
    try {
      const response = await api.get('/weekly_reports/current_week');
      const data = response.data;
      setReport(data);
      
      if (data.content || data.plans || data.problems || data.other) {
        form.setFieldsValue(data);
      }
    } catch (error) {
      message.error('获取周报失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentWeekReport();
  }, []);

  const handleSave = async (submitNow = false) => {
    const values = await form.validateFields();
    setSaving(true);
    
    try {
      if (report && report.id) {
        await api.put(`/weekly_reports/${report.id}`, {
          ...values,
          submit_now: submitNow,
        });
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const weekNumber = Math.ceil((today - new Date(year, 0, 1)) / 604800000);
        const firstDay = new Date(year, 0, 1);
        const day = firstDay.getDay() || 7;
        const actualWeekNumber = Math.ceil((((today - firstDay) / 86400000) + day - 1) / 7);
        
        await api.post('/weekly_reports', {
          year: year,
          week_number: actualWeekNumber,
          ...values,
          submit_now: submitNow,
        });
      }
      
      message.success(submitNow ? '提交成功！' : '草稿保存成功');
      fetchCurrentWeekReport();
    } catch (error) {
      message.error(error.response?.data?.msg || '操作失败');
    } finally {
      setSaving(false);
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
        return null;
    }
  };

  const isEditable = !report || report.status !== 'submitted';

  return (
    <div>
      <h3 className="page-title">填写周报</h3>
      
      {report && report.week_start && (
        <Card style={{ marginBottom: 16 }}>
          <Space>
            <span>当前周期：</span>
            <strong>
              {dayjs(report.week_start).format('YYYY年MM月DD日')} - {dayjs(report.week_end).format('YYYY年MM月DD日')}
            </strong>
            {report.status && getStatusTag(report.status)}
          </Space>
        </Card>
      )}

      {report?.return_reason && (
        <Alert
          message="退回原因"
          description={report.return_reason}
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        disabled={!isEditable}
      >
        <Card title="本周工作内容" className="report-card">
          <Form.Item name="content">
            <TextArea
              rows={6}
              placeholder="请填写本周工作内容..."
              disabled={!isEditable}
            />
          </Form.Item>
        </Card>

        <Card title="下周工作计划" className="report-card">
          <Form.Item name="plans">
            <TextArea
              rows={4}
              placeholder="请填写下周工作计划..."
              disabled={!isEditable}
            />
          </Form.Item>
        </Card>

        <Card title="遇到的问题与建议" className="report-card">
          <Form.Item name="problems">
            <TextArea
              rows={3}
              placeholder="请填写遇到的问题与建议..."
              disabled={!isEditable}
            />
          </Form.Item>
        </Card>

        <Card title="其他" className="report-card">
          <Form.Item name="other">
            <TextArea
              rows={2}
              placeholder="其他需要说明的内容..."
              disabled={!isEditable}
            />
          </Form.Item>
        </Card>

        {isEditable && (
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button
                icon={<SaveOutlined />}
                onClick={() => handleSave(false)}
                loading={saving}
              >
                保存草稿
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleSave(true)}
                loading={saving}
              >
                正式提交
              </Button>
            </Space>
          </div>
        )}

        {!isEditable && (
          <Alert
            message="周报已提交，无法修改"
            type="info"
            showIcon
            style={{ marginTop: 24 }}
          />
        )}
      </Form>
    </div>
  );
};

export default MyReport;
