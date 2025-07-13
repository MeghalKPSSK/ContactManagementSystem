import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card, List, Tag, Space, Select, Typography, Spin } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import styles from './Dashboard.module.css';
import apiService from '../../services/apiService';

const { Title } = Typography;

const chartColors = {
  pie: [
    '#4B70DD',  // Royal Blue
    '#8E54E9',  // Purple
    '#E94584',  // Pink Red
    '#4B9EFF',  // Light Blue
    '#B4CEFF',  // Softer Blue
    '#FFB3B3',  // Light Red
  ],
  bar: [
    '#8E54E9',  // Purple for favorites
    '#4B70DD'   // Royal Blue for regular
  ]
};

function Dashboard() {
  const [contacts, setContacts] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState({
    contacts: false,
    charts: false
  });

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 9,
    total: 0
  });

  const [pieOptions, setPieOptions] = useState({
    series: [],
    options: {
      chart: { 
        type: 'pie',
        background: 'transparent',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          },
          export: {
            svg: true,
            csv: true,
            png: true
          },
          autoSelected: 'zoom'
        },
        animations: {
          enabled: true,
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },
      labels: [],
      colors: chartColors.pie,
      legend: {
        position: 'bottom',
        markers: {
          fillColors: chartColors.pie,
          radius: 4,
          strokeWidth: 0
        },
        labels: {
          colors: 'var(--text-secondary)'
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          chart: { width: 200 },
          legend: { position: 'bottom' }
        }
      }],
      theme: {
        mode: 'light',
        palette: 'palette1'
      },
      stroke: {
        width: 1,
        colors: ['#fff']
      },
      plotOptions: {
        pie: {
          donut: {
            size: '0%'
          },
          expandOnClick: true
        }
      },
      states: {
        hover: {
          filter: {
            type: 'lighten',
            value: 0.15
          }
        },
        active: {
          filter: {
            type: 'none'
          }
        }
      },
      tooltip: {
        style: {
          fontSize: '14px'
        },
        y: {
          formatter: (value) => `${value} contacts`,
          title: {
            formatter: (seriesName) => seriesName
          }
        },
        theme: 'light',
        fillSeriesColor: false
      }
    }
  });

  const [barOptions, setBarOptions] = useState({
    series: [{
      name: 'Contacts',
      data: [0, 0]
    }],
    options: {
      chart: {
        type: 'bar',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          },
          export: {
            svg: true,
            csv: true,
            png: true
          }
        },
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          }
        }
      },
      colors: chartColors.bar,
      plotOptions: {
        bar: {
          borderRadius: 6,
          columnWidth: '60%',
          distributed: true,
          dataLabels: {
            position: 'top'
          },
          hover: {
            color: '#8E54E9'
          },
          colors: {
            ranges: [{
              from: 0,
              to: 0,
              color: chartColors.bar[0]
            }, {
              from: 1,
              to: 1,
              color: chartColors.bar[1]
            }]
          }
        }
      },
      dataLabels: {
        enabled: true,
        style: {
          fontSize: '14px',
          fontWeight: 500,
          colors: ['#fff', '#fff']  // White text for both columns
        },
        offsetY: -20
      },
      xaxis: {
        categories: ['Favorite', 'Regular'],
        labels: {
          style: {
            colors: ['var(--text-secondary)', 'var(--text-secondary)'],
            fontSize: '14px'
          }
        }
      },
      fill: {
        opacity: 0.9
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4
      },
      yaxis: {
        labels: {
          style: {
            colors: 'var(--text-secondary)'
          }
        }
      },
      legend: {
        show: true,
        position: 'bottom',
        markers: {
          fillColors: chartColors.bar,
          radius: 4,
          strokeWidth: 0
        },
        labels: {
          colors: 'var(--text-secondary)'
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        }
      },
      theme: {
        mode: 'light'
      },
      states: {
        hover: {
          filter: {
            type: 'lighten',
            value: 0.15
          }
        },
        active: {
          filter: {
            type: 'none'
          }
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (value) => `${value} contacts`
        },
        theme: 'light'
      }
    }
  });

  const fetchContactsData = async (page = 1) => {
    setLoading(prev => ({ ...prev, contacts: true }));
    try {
      const userId = JSON.parse(localStorage.getItem('user')).uid;
      
      // Fetch tags for dropdown only if tags array is empty
      if (tags.length === 0) {
        const tagsData = await apiService.fetch(`/contacts/tags?userId=${userId}`, {
          method: 'GET'
        });
        if (tagsData.success) {
          setTags(tagsData.tags);
        }
      }
      
      // Fetch filtered contacts
      const contactsData = await apiService.fetch(
        `/dashboard/contacts?` + 
        new URLSearchParams({
          userId,
          tags: selectedTags.length > 0 ? selectedTags.join(',') : '',
          page,
          pageSize: pagination.pageSize
        }).toString(),
        {
          method: 'GET'
        }
      );

      if (contactsData.success) {
        setContacts(contactsData.contacts);
        setPagination(prev => ({
          ...prev,
          current: page,
          total: contactsData.total
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(prev => ({ ...prev, contacts: false }));
    }
  };

  const fetchChartData = async () => {
    try {
      setLoading(prev => ({ ...prev, charts: true }));
      const userId = JSON.parse(localStorage.getItem('user')).uid;

      const [tagsData, favoritesData] = await Promise.all([
        apiService.fetch(`/dashboard/tags-distribution?userId=${userId}`, {
          method: 'GET'
        }),
        apiService.fetch(`/dashboard/favorites-count?userId=${userId}`, {
          method: 'GET'
        })
      ]);

      if (tagsData.success && favoritesData.success) {
        updateChartOptions(tagsData, favoritesData);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(prev => ({ ...prev, charts: false }));
    }
  };

  // Helper function to update chart options
  const updateChartOptions = (tagsData, favoritesData) => {
    setPieOptions(prev => ({
      ...prev,
      series: tagsData.counts,
      options: {
        ...prev.options,
        labels: tagsData.labels,
        colors: chartColors.pie.slice(0, tagsData.labels.length), // Only use as many colors as needed
        legend: {
          ...prev.options.legend,
          markers: {
            ...prev.options.legend.markers,
            fillColors: chartColors.pie.slice(0, tagsData.labels.length)
          }
        }
      }
    }));

    setBarOptions(prev => ({
      ...prev,
      series: [{
        name: 'Contacts',
        data: [favoritesData.favorite, favoritesData.regular]
      }],
      options: {
        ...prev.options,
        colors: chartColors.bar,
        plotOptions: {
          ...prev.options.plotOptions,
          bar: {
            ...prev.options.plotOptions.bar,
            colors: {
              ranges: [{
                from: 0,
                to: 0,
                color: chartColors.bar[0]
              }, {
                from: 1,
                to: 1,
                color: chartColors.bar[1]
              }]
            }
          }
        }
      }
    }));
  };

  const handlePageChange = (page) => {
    fetchContactsData(page);
  };

  // Initial data fetch
  useEffect(() => {
    fetchContactsData();
  }, []);

  // Remove the contacts dependency for chart data
  useEffect(() => {
    fetchChartData();
  }, []); // Only fetch chart data once on component mount

  // Update the tag filtering effect to include pagination
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      current: 1 // Reset to first page when filters change
    }));
    fetchContactsData(1);
  }, [selectedTags]);

  return (
    <div className={styles.dashboard}>
      <div className={styles.chartsContainer}>
        <Card className={styles.chartCard}>
          <Title level={4}>Contacts by Tags</Title>
          {loading.charts ? (
            <div className={styles.chartLoader}>
              <Spin size="large" />
            </div>
          ) : (
            <ReactApexChart 
              options={pieOptions.options}
              series={pieOptions.series}
              type="pie"
              height={350}
            />
          )}
        </Card>
        <Card className={styles.chartCard}>
          <Title level={4}>Favorite vs Regular Contacts</Title>
          {loading.charts ? (
            <div className={styles.chartLoader}>
              <Spin size="large" />
            </div>
          ) : (
            <ReactApexChart 
              options={barOptions.options}
              series={barOptions.series}
              type="bar"
              height={350}
            />
          )}
        </Card>
      </div>
      <Card className={styles.contactsList}>
        <Space className={styles.filterContainer}>
          <Title level={4}>Contacts List</Title>
          <Select
            mode="multiple"
            placeholder="Filter by tags"
            value={selectedTags}
            onChange={setSelectedTags}
            options={tags.map(tag => ({ 
              label: tag.name, 
              value: tag.name,
              key: tag.uid // Add key for better performance
            }))}
            style={{ minWidth: 200 }}
            className={styles.tagFilter}
            allowClear
            loading={loading.contacts}
          />
        </Space>

        <List
          loading={loading.contacts}
          grid={{ 
            gutter: 16,
            xs: 1,
            sm: 1,
            md: 2,
            lg: 2,
            xl: 3,
            xxl: 3,
          }}
          dataSource={contacts}
          pagination={{
            ...pagination,
            onChange: handlePageChange
          }}
          renderItem={contact => (
            <List.Item key={contact.uid} style={{ borderRadius: '7px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
              <Card 
                className={styles.contactCard}
              >
                <div className={styles.favoriteIndicator}>
                  {contact.is_favorite ? 
                    <StarFilled className={styles.starFilled} /> : 
                    <StarOutlined className={styles.starOutlined} />
                  }
                </div>
                <Card.Meta
                  title={
                    <div className={styles.contactTitle}>
                      {contact.firstName}
                      {contact.lastName && ` ${contact.lastName}`}
                    </div>
                  }
                  description={
                    <div className={styles.contactCardContent}>
                      <div className={styles.contactDetails}>
                        {contact.phone && (
                          <div className={styles.contactField}>
                            📞 {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className={styles.contactField}>
                            ✉️ {contact.email}
                          </div>
                        )}
                      </div>
                      <div className={styles.tagContainer}>
                        {contact.tags?.map(tag => (
                          <Tag 
                            key={tag.uid} 
                            color="processing"           // Ant Design's blue processing color
                            className={styles.contactTag}
                          >
                            {tag.name}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  }
                />
              </Card>
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}

export default Dashboard;
