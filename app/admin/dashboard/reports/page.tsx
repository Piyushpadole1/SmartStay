'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, FileText, Users, Mars, Venus, TrendingUp } from 'lucide-react'
import { BRANCHES, YEARS, type Branch, type Year } from '@/lib/types'
import { db } from '@/lib/firebase/config'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'

export default function ReportsPage() {
  const [selectedBranch, setSelectedBranch] = useState<Branch>('CSE')
  const [selectedYear, setSelectedYear] = useState<Year>(1)
  const [selectedStatus, setSelectedStatus] = useState<'selected' | 'waitlisted' | 'confirmed'>('selected')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    boysSelected: 0,
    boysWaitlisted: 0,
    boysConfirmed: 0,
    girlsSelected: 0,
    girlsWaitlisted: 0,
    girlsConfirmed: 0,
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const applicationsRef = collection(db, 'applications')
      
      // Fetch all applications
      const snapshot = await getDocs(applicationsRef)
      const applications = snapshot.docs.map(doc => doc.data())
      
      // Calculate stats
      const boysSelected = applications.filter(a => a.gender === 'Male' && a.status === 'selected').length
      const boysWaitlisted = applications.filter(a => a.gender === 'Male' && a.status === 'waitlisted').length
      const boysConfirmed = applications.filter(a => a.gender === 'Male' && a.status === 'confirmed').length
      const girlsSelected = applications.filter(a => a.gender === 'Female' && a.status === 'selected').length
      const girlsWaitlisted = applications.filter(a => a.gender === 'Female' && a.status === 'waitlisted').length
      const girlsConfirmed = applications.filter(a => a.gender === 'Female' && a.status === 'confirmed').length
      
      setStats({
        boysSelected,
        boysWaitlisted,
        boysConfirmed,
        girlsSelected,
        girlsWaitlisted,
        girlsConfirmed,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const downloadStudentList = async (hostelType: 'boys' | 'girls') => {
    setLoading(true)
    try {
      const applicationsRef = collection(db, 'applications')
      const gender = hostelType === 'boys' ? 'Male' : 'Memale'
      
      const q = query(
        applicationsRef,
        where('branch', '==', selectedBranch),
        where('year', '==', selectedYear),
        where('gender', '==', gender),
        where('status', '==', selectedStatus),
        orderBy('meritRank', 'asc')
      )

      const querySnapshot = await getDocs(q)
      const students = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      // Generate CSV content
      const headers = ['Rank', 'Roll No', 'Name', 'Email', 'Phone', 'Category', 'Caste', 'Admission Type', 'Marks/SGPA', 'Room Number', 'Status']
      const rows = students.map((student: any, index) => [
        student.meritRank || index + 1,
        student.aadhaarNumber?.slice(-6) || 'N/A',
        student.fullName,
        student.email,
        student.phone,
        student.category,
        student.caste || 'N/A',
        student.admissionType,
        student.cetMarks || student.sgpa || 'N/A',
        student.roomNumber || 'Not Allocated',
        student.status
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))
      ].join('\n')

      // Download CSV
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent))
      element.setAttribute('download', `${hostelType}-${selectedBranch}-Year${selectedYear}-${selectedStatus}.csv`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      
      // Show success message
      alert(`Downloaded ${students.length} ${hostelType} ${selectedStatus} students`)
    } catch (error) {
      console.error('Error downloading list:', error)
      alert('Error downloading list. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const downloadBothHostels = async () => {
    setLoading(true)
    try {
      const applicationsRef = collection(db, 'applications')
      
      // Download for boys
      const boysQuery = query(
        applicationsRef,
        where('branch', '==', selectedBranch),
        where('year', '==', selectedYear),
        where('gender', '==', 'Male'),
        where('status', '==', selectedStatus),
        orderBy('meritRank', 'asc')
      )
      
      // Download for girls
      const girlsQuery = query(
        applicationsRef,
        where('branch', '==', selectedBranch),
        where('year', '==', selectedYear),
        where('gender', '==', 'Memale'),
        where('status', '==', selectedStatus),
        orderBy('meritRank', 'asc')
      )
      
      const [boysSnapshot, girlsSnapshot] = await Promise.all([
        getDocs(boysQuery),
        getDocs(girlsQuery)
      ])
      
      const boys = boysSnapshot.docs.map((doc, index) => ({ id: doc.id, ...doc.data(), rank: index + 1 }))
      const girls = girlsSnapshot.docs.map((doc, index) => ({ id: doc.id, ...doc.data(), rank: index + 1 }))
      
      // Generate combined CSV
      const headers = ['Hostel', 'Rank', 'Roll No', 'Name', 'Email', 'Phone', 'Category', 'Caste', 'Admission Type', 'Marks/SGPA', 'Room Number', 'Status']
      
      const boysRows = boys.map((student: any) => [
        'Boys',
        student.rank,
        student.aadhaarNumber?.slice(-6) || 'N/A',
        student.fullName,
        student.email,
        student.phone,
        student.category,
        student.caste || 'N/A',
        student.admissionType,
        student.cetMarks || student.sgpa || 'N/A',
        student.roomNumber || 'Not Allocated',
        student.status
      ])
      
      const girlsRows = girls.map((student: any) => [
        'Girls',
        student.rank,
        student.aadhaarNumber?.slice(-6) || 'N/A',
        student.fullName,
        student.email,
        student.phone,
        student.category,
        student.caste || 'N/A',
        student.admissionType,
        student.cetMarks || student.sgpa || 'N/A',
        student.roomNumber || 'Not Allocated',
        student.status
      ])
      
      const csvContent = [
        headers.join(','),
        ...boysRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
        ...girlsRows.map((row) => row.map((cell) => `"${cell}"`).join(','))
      ].join('\n')
      
      // Download combined CSV
      const element = document.createElement('a')
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent))
      element.setAttribute('download', `Both-Hostels-${selectedBranch}-Year${selectedYear}-${selectedStatus}.csv`)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)
      
      alert(`Downloaded combined report: ${boys.length} boys + ${girls.length} girls = ${boys.length + girls.length} total students`)
    } catch (error) {
      console.error('Error downloading combined list:', error)
      alert('Error downloading combined list. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reports & Exports</h1>
        <p className="text-muted-foreground">Download selected, waitlisted, and confirmed students</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Boys Stats */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <Mars className="h-5 w-5" />
              Boys Hostel Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.boysSelected}</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.boysWaitlisted}</p>
                <p className="text-xs text-muted-foreground">Waitlisted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.boysConfirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Girls Stats */}
        <Card className="border-pink-200 bg-pink-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-pink-700">
              <Venus className="h-5 w-5" />
              Girls Hostel Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-pink-700">{stats.girlsSelected}</p>
                <p className="text-xs text-muted-foreground">Selected</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-700">{stats.girlsWaitlisted}</p>
                <p className="text-xs text-muted-foreground">Waitlisted</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.girlsConfirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Options</CardTitle>
          <CardDescription>Select criteria to download student lists</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Branch Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Branch</label>
              <Select value={selectedBranch} onValueChange={(value) => setSelectedBranch(value as Branch)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((branch) => (
                    <SelectItem key={branch} value={branch}>
                      {branch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value) as Year)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Student Status</label>
              <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as 'selected' | 'waitlisted' | 'confirmed')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="selected">Selected Students</SelectItem>
                  <SelectItem value="waitlisted">Waitlisted Students</SelectItem>
                  <SelectItem value="confirmed">Confirmed Students</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => downloadStudentList('boys')} 
                disabled={loading}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                <Mars className="h-4 w-4" />
                {loading ? 'Downloading...' : 'Download Boys Only'}
              </Button>

              <Button 
                onClick={() => downloadStudentList('girls')} 
                disabled={loading}
                className="gap-2 bg-pink-600 hover:bg-pink-700"
              >
                <Download className="h-4 w-4" />
                <Venus className="h-4 w-4" />
                {loading ? 'Downloading...' : 'Download Girls Only'}
              </Button>

              <Button 
                onClick={downloadBothHostels} 
                disabled={loading}
                variant="default"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" />
                <TrendingUp className="h-4 w-4" />
                {loading ? 'Downloading...' : 'Download Both Hostels'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Export Format
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Data is exported as CSV (Comma-Separated Values) format for easy import to Excel or other tools.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5" />
              Included Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Rank & Roll Number</li>
              <li>✓ Student names & contact</li>
              <li>✓ Category & Caste</li>
              <li>✓ Admission type & marks</li>
              <li>✓ Room allocation</li>
              <li>✓ Application status</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Download Options</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Boys Hostel only</li>
              <li>✓ Girls Hostel only</li>
              <li>✓ Both hostels combined</li>
              <li>✓ Selected/Waitlisted/Confirmed status</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}